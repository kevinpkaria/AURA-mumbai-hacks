"""
AI Agents - LangGraph implementation with state management
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any, List, Optional, TypedDict, Annotated
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.consultation import Consultation
from app.models.message import Message, MessageRole
from app.models.document import Document
from app.models.user import User
from app.models.appointment import Appointment, AppointmentMode
from app.models.user import UserRole
from datetime import datetime, timedelta
import json

logger = get_logger("ai_agents_langgraph")


class AgentState(TypedDict):
    """State for the LangGraph agent"""
    messages: Annotated[list, add_messages]
    consultation_id: int
    patient_id: int


class PatientAgentLangGraph:
    """AURA Patient Agent using LangGraph for state management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY
        )
    
    def _create_tools(self, consultation_id: int, patient_id: int):
        """Create LangChain tools bound to this agent instance"""
        db = self.db
        
        @tool
        async def handoff_to_doctor() -> str:
            """Escalate consultation to a human doctor. ONLY use for serious symptoms or explicit requests. This will assign a doctor to the consultation."""
            logger.info(f"👨‍⚕️ Handing off consultation {consultation_id} to doctor")
            try:
                # Rollback any previous failed transaction
                await db.rollback()
            except:
                pass
            
            result = await db.execute(
                select(Consultation).where(Consultation.id == consultation_id)
            )
            consultation = result.scalar_one_or_none()
            if not consultation:
                return "Consultation not found"
            
            # If already assigned, return success
            if consultation.doctor_id:
                logger.info(f"✅ Consultation {consultation_id} already assigned to doctor {consultation.doctor_id}")
                return "A doctor has already been assigned to this consultation. They will review it shortly."
            
            # Find an available doctor (preferably from the same hospital as the patient)
            # First, get the patient to check their hospital
            patient_result = await db.execute(
                select(User).where(User.id == consultation.patient_id)
            )
            patient = patient_result.scalar_one_or_none()
            
            # Find a doctor (prefer same hospital, otherwise any doctor)
            doctor_query = select(User).where(User.role == UserRole.DOCTOR)
            if patient and patient.hospital_id:
                doctor_query = doctor_query.where(User.hospital_id == patient.hospital_id)
            
            doctor_result = await db.execute(doctor_query.limit(1))
            doctor = doctor_result.scalar_one_or_none()
            
            if not doctor:
                logger.warning(f"⚠️ No doctor available for consultation {consultation_id}")
                return "I've requested a doctor to join the chat. A healthcare professional will review your consultation and respond shortly."
            
            # Assign doctor to consultation
            consultation.doctor_id = doctor.id
            consultation.status = "in_progress"
            
            try:
                await db.commit()
                logger.info(f"✅ Consultation {consultation_id} assigned to doctor {doctor.id} ({doctor.name})")
                return f"I've requested Dr. {doctor.name} to join the chat. They will review your consultation and respond shortly."
            except Exception as e:
                await db.rollback()
                logger.error(f"❌ Failed to handoff consultation: {str(e)}", exc_info=True)
                return f"Failed to escalate consultation: {str(e)}"
        
        @tool
        async def get_available_doctors(hospital_id: Optional[int] = None) -> str:
            """Get list of available doctors. ONLY use this AFTER you have gathered sufficient information about the patient's condition and they want to schedule an appointment. DO NOT call this immediately when a patient first describes symptoms - have a conversation first.
            
            CRITICAL: When you receive the response, you MUST use the EXACT doctor IDs from the response. DO NOT make up or guess doctor IDs. The response will contain a list of doctors with their IDs - use ONLY those IDs."""
            logger.info(f"👨‍⚕️ Fetching available doctors (hospital_id: {hospital_id})")
            query = select(User).where(User.role == UserRole.DOCTOR)
            if hospital_id:
                query = query.where(User.hospital_id == hospital_id)
            
            result = await db.execute(query)
            doctors = result.scalars().all()
            
            # Filter to ensure we only return actual doctors and log their IDs
            doctor_list = []
            for doc in doctors:
                if doc.role == UserRole.DOCTOR:  # Double-check role
                    doctor_list.append({
                        "id": doc.id,
                        "name": doc.name,
                        "email": doc.email
                    })
                    logger.info(f"  - Doctor {doc.id}: {doc.name} ({doc.email})")
            
            if not doctor_list:
                logger.warning(f"⚠️ No doctors found matching criteria (hospital_id: {hospital_id})")
                return json.dumps({
                    "doctors": [],
                    "count": 0,
                    "error": "No doctors are currently available. Please try again later or contact support."
                })
            
            logger.info(f"✅ Found {len(doctor_list)} doctor(s)")
            # Return with explicit instruction about using exact IDs
            return json.dumps({
                "doctors": doctor_list,
                "count": len(doctor_list),
                "valid_ids": [d["id"] for d in doctor_list],  # Explicit list of valid IDs
                "instruction": "IMPORTANT: You MUST use ONLY the doctor IDs listed above. Valid IDs: " + ", ".join([str(d["id"]) for d in doctor_list])
            })
        
        @tool
        async def check_doctor_availability(doctor_id: int, date: str) -> str:
            """Check doctor's availability for a date and get time slots. Use AFTER patient selects doctor and date.
            
            CRITICAL: doctor_id MUST be one of the IDs returned by get_available_doctors. DO NOT use made-up IDs."""
            logger.info(f"📅 Checking availability for doctor {doctor_id} on {date}")
            
            # Validate doctor exists first
            doctor_result = await db.execute(
                select(User).where(User.id == doctor_id, User.role == UserRole.DOCTOR)
            )
            doctor = doctor_result.scalar_one_or_none()
            if not doctor:
                logger.error(f"❌ Doctor {doctor_id} not found or is not a doctor")
                # Get available doctors to suggest
                doctors_result = await db.execute(
                    select(User).where(User.role == UserRole.DOCTOR).limit(5)
                )
                available_doctors = doctors_result.scalars().all()
                if available_doctors:
                    doctor_list = [f"{d.name} (ID: {d.id})" for d in available_doctors]
                    valid_ids = [str(d.id) for d in available_doctors]
                    return json.dumps({
                        "error": f"INVALID DOCTOR ID {doctor_id}. This ID does not exist. You MUST use one of these valid IDs: {', '.join(valid_ids)}. Available doctors: {', '.join(doctor_list)}. Please call get_available_doctors again if needed."
                    })
                return json.dumps({"error": f"INVALID DOCTOR ID {doctor_id}. This ID does not exist. Please call get_available_doctors to get valid doctor IDs."})
            
            # Try to parse the date - handle multiple formats
            target_date = None
            date_formats = [
                "%Y-%m-%d",  # 2025-11-30
                "%d %b %Y",  # 30 Nov 2025
                "%d %B %Y",  # 30 November 2025
                "%d/%m/%Y",  # 30/11/2025
                "%m/%d/%Y",  # 11/30/2025
                "%d-%m-%Y",  # 30-11-2025
            ]
            
            # Try current year if no year specified
            from datetime import date as date_type
            current_year = date_type.today().year
            
            for fmt in date_formats:
                try:
                    target_date = datetime.strptime(date, fmt).date()
                    break
                except ValueError:
                    continue
            
            # If still not parsed, try with current year appended
            if not target_date:
                for fmt in ["%d %b", "%d %B", "%d/%m", "%m/%d"]:
                    try:
                        parsed = datetime.strptime(date, fmt)
                        target_date = date_type(current_year, parsed.month, parsed.day)
                        # If the date is in the past, assume next year
                        if target_date < date_type.today():
                            target_date = date_type(current_year + 1, parsed.month, parsed.day)
                        break
                    except ValueError:
                        continue
            
            if not target_date:
                logger.error(f"❌ Could not parse date: {date}")
                current_year = date_type.today().year
                return json.dumps({
                    "error": f"Could not understand the date '{date}'. Please provide the date in a format like '{current_year}-11-30', '30 Nov {current_year}', or '30 Nov' (I'll assume current year)."
                })
            
            start_of_day = datetime.combine(target_date, datetime.min.time())
            end_of_day = datetime.combine(target_date, datetime.max.time())
            
            result = await db.execute(
                select(Appointment).where(
                    and_(
                        Appointment.doctor_id == doctor_id,
                        Appointment.datetime >= start_of_day,
                        Appointment.datetime < end_of_day + timedelta(days=1)
                    )
                ).order_by(Appointment.datetime)
            )
            existing_appointments = result.scalars().all()
            
            # Generate available slots (9 AM to 5 PM, 30-minute slots)
            available_slots = []
            for hour in range(9, 17):
                for minute in [0, 30]:
                    slot_time = datetime.combine(target_date, datetime.min.time().replace(hour=hour, minute=minute))
                    
                    # Check conflicts
                    is_available = True
                    for apt in existing_appointments:
                        apt_start = apt.datetime
                        apt_end = apt_start + timedelta(minutes=30)
                        if slot_time >= apt_start and slot_time < apt_end:
                            is_available = False
                            break
                    
                    if is_available:
                        available_slots.append({
                            "datetime": slot_time.isoformat(),
                            "time": slot_time.strftime("%I:%M %p"),
                            "formatted": slot_time.strftime("%I:%M %p")
                        })
            
            logger.info(f"✅ Found {len(available_slots)} available slot(s)")
            return json.dumps({
                "doctor_id": doctor_id,
                "date": date,
                "available_slots": available_slots[:10],
                "total_slots": len(available_slots)
            })
        
        @tool
        async def schedule_appointment(
            doctor_id: int,
            datetime_str: str,
            mode: str
        ) -> str:
            """Schedule the appointment. ONLY call after all details are confirmed.
            
            CRITICAL: doctor_id MUST be one of the IDs returned by get_available_doctors. DO NOT use made-up IDs. If you're not sure of the doctor ID, call get_available_doctors again."""
            logger.info(f"📅 Scheduling appointment for patient {patient_id} with doctor {doctor_id}")
            
            try:
                # Rollback any previous failed transaction
                await db.rollback()
                
                # Validate doctor exists and is actually a doctor
                doctor_result = await db.execute(
                    select(User).where(User.id == doctor_id)
                )
                doctor = doctor_result.scalar_one_or_none()
                if not doctor:
                    logger.error(f"❌ Doctor {doctor_id} not found in database - INVALID ID")
                    # Try to get available doctors again to suggest valid ones
                    doctors_result = await db.execute(
                        select(User).where(User.role == UserRole.DOCTOR).limit(5)
                    )
                    available_doctors = doctors_result.scalars().all()
                    if available_doctors:
                        doctor_names = [f"{d.name} (ID: {d.id})" for d in available_doctors]
                        valid_ids = [str(d.id) for d in available_doctors]
                        return json.dumps({
                            "success": False,
                            "error": f"ERROR: Doctor ID {doctor_id} DOES NOT EXIST. You MUST use one of these valid IDs: {', '.join(valid_ids)}. Available doctors: {', '.join(doctor_names)}. You MUST call get_available_doctors again to get the correct list of doctors and use ONLY those IDs."
                        })
                    return json.dumps({"success": False, "error": f"ERROR: Doctor ID {doctor_id} DOES NOT EXIST. You MUST call get_available_doctors to get valid doctor IDs. DO NOT make up IDs."})
                
                if doctor.role != UserRole.DOCTOR:
                    logger.error(f"❌ User {doctor_id} ({doctor.name}) is not a doctor (role: {doctor.role.value})")
                    return json.dumps({"success": False, "error": f"User {doctor_id} is not a doctor. Please select a valid doctor from the list."})
                
                # Validate patient exists
                patient_result = await db.execute(
                    select(User).where(User.id == patient_id)
                )
                patient = patient_result.scalar_one_or_none()
                if not patient:
                    logger.error(f"❌ Patient {patient_id} not found")
                    return json.dumps({"success": False, "error": "Patient not found"})
                
                try:
                    appointment_datetime = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
                except ValueError:
                    appointment_datetime = datetime.fromisoformat(datetime_str)
                
                # Validate date is not in the past
                from datetime import date as date_type
                today = date_type.today()
                appointment_date = appointment_datetime.date()
                
                if appointment_date < today:
                    logger.error(f"❌ Cannot schedule appointment in the past: {appointment_date} (today is {today})")
                    return json.dumps({
                        "success": False,
                        "error": f"Cannot schedule appointment in the past. The date {appointment_date.strftime('%B %d, %Y')} has already passed. Today is {today.strftime('%B %d, %Y')}. Please select a future date."
                    })
                
                # Check availability
                end_datetime = appointment_datetime + timedelta(minutes=30)
                conflict_conditions = [
                    Appointment.datetime < end_datetime,
                    Appointment.datetime + timedelta(minutes=30) > appointment_datetime,
                    Appointment.doctor_id == doctor_id
                ]
                
                conflict_result = await db.execute(
                    select(Appointment).where(and_(*conflict_conditions))
                )
                conflicts = conflict_result.scalars().all()
                
                if conflicts:
                    return json.dumps({"success": False, "error": "Time slot is not available"})
                
                # Assign consultation to doctor if not already assigned
                consultation_result = await db.execute(
                    select(Consultation).where(Consultation.id == consultation_id)
                )
                consultation = consultation_result.scalar_one_or_none()
                if consultation:
                    if not consultation.doctor_id:
                        consultation.doctor_id = doctor_id
                        consultation.status = "in_progress"
                        logger.info(f"✅ Consultation {consultation_id} assigned to doctor {doctor_id}")
                    elif consultation.doctor_id != doctor_id:
                        logger.warning(f"⚠️ Consultation {consultation_id} already assigned to doctor {consultation.doctor_id}, but appointment is with doctor {doctor_id}")
                
                # Create appointment
                appointment_mode = AppointmentMode.ONLINE if mode == "online" else AppointmentMode.IN_PERSON
                new_appointment = Appointment(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    consultation_id=consultation_id,
                    datetime=appointment_datetime,
                    mode=appointment_mode,
                    external_link=None
                )
                
                db.add(new_appointment)
                await db.commit()
                await db.refresh(new_appointment)
                
                logger.info(f"✅ Appointment {new_appointment.id} created successfully")
                return json.dumps({
                    "success": True,
                    "appointment_id": new_appointment.id,
                    "datetime": datetime_str,
                    "mode": mode,
                    "doctor_name": doctor.name
                })
            except Exception as e:
                await db.rollback()
                logger.error(f"❌ Failed to schedule appointment: {str(e)}", exc_info=True)
                return json.dumps({"success": False, "error": f"Failed to schedule appointment: {str(e)}"})
        
        return [
            handoff_to_doctor,
            get_available_doctors,
            check_doctor_availability,
            schedule_appointment
        ]
    
    async def _call_agent(self, state: AgentState) -> AgentState:
        """Call the LLM agent"""
        consultation_id = state["consultation_id"]
        patient_id = state["patient_id"]
        
        # Rollback any previous failed transaction to ensure clean state
        try:
            await self.db.rollback()
        except:
            pass
        
        # Get patient history
        docs_result = await self.db.execute(
            select(Document).where(Document.patient_id == patient_id)
        )
        documents = docs_result.scalars().all()
        
        cons_result = await self.db.execute(
            select(Consultation).where(Consultation.patient_id == patient_id)
        )
        consultations = cons_result.scalars().all()
        
        history = {
            "documents": [{"name": d.name, "summary": d.summary} for d in documents],
            "consultations": len(consultations)
        }
        
        # Get current date for context
        from datetime import date as date_type
        current_date = date_type.today()
        current_year = current_date.year
        current_month = current_date.month
        current_day = current_date.day
        
        # Build system message
        system_message = SystemMessage(content=f"""You are AURA, an advanced medical AI assistant designed to help patients understand their health concerns.

CURRENT CONTEXT:
- Consultation ID: {consultation_id}
- Patient ID: {patient_id}
- TODAY'S DATE: {current_date.strftime('%B %d, %Y')} (Year: {current_year}, Month: {current_month}, Day: {current_day})

IMPORTANT: The current year is {current_year}. When scheduling appointments, you MUST use dates in {current_year} or later. NEVER use dates from 2023 or 2024 - those are in the past.

Patient History:
{json.dumps(history, indent=2)}

=== PRIMARY ROLE: GATHER INFORMATION AND PROVIDE GUIDANCE ===

YOUR MAIN PRIORITY is to:
1. **Listen and Understand**: Be conversational, empathetic, and ask follow-up questions to understand the patient's symptoms, concerns, and medical history
2. **Provide Information**: Offer helpful medical information, explain possible causes, and suggest self-care measures when appropriate
3. **Assess Risk**: Evaluate the severity of symptoms and determine if immediate medical attention is needed
4. **Offer Next Steps**: Only AFTER gathering sufficient information, suggest scheduling an appointment if needed

CONVERSATION FLOW:
- Start by asking about the patient's main concern or symptoms
- Ask follow-up questions: duration, severity, location, triggers, associated symptoms
- Show empathy and understanding
- Provide relevant medical information and context
- Assess whether the condition requires professional medical attention
- Only suggest scheduling an appointment AFTER you've gathered enough information and determined it's necessary

=== APPOINTMENT SCHEDULING (ONLY AFTER INFORMATION GATHERING) ===

ONLY offer to schedule an appointment when:
- You have gathered sufficient information about the patient's condition
- The patient explicitly asks to schedule an appointment
- You determine that professional medical attention is recommended
- The patient has completed describing their symptoms

APPOINTMENT SCHEDULING FLOW (STRICT - ONLY AFTER INFORMATION GATHERING):
1. When patient wants to schedule OR you recommend it: Call get_available_doctors FIRST
2. Present doctors and wait for patient to SELECT a doctor
3. Ask for preferred date (REMEMBER: Current year is {current_year}, use {current_year} or later dates)
4. Call check_doctor_availability with doctor_id and date
5. Show time slots and wait for patient to SELECT a time
6. Suggest online/in-person mode and wait for CONFIRMATION
7. Provide summary and get FINAL confirmation
8. ONLY THEN call schedule_appointment

CRITICAL DATE RULES (VERY IMPORTANT):
- Current year is {current_year} (today is {current_date.strftime('%B %d, %Y')})
- NEVER schedule appointments in 2023, 2024, or any past year
- When patient says dates like "30 nov" or "november 30", assume they mean {current_year} (or next year if that date has passed)
- Always use dates in {current_year} or later
- If patient mentions a date that seems to be in the past, clarify and use a future date
- When calling schedule_appointment, the datetime MUST be in the future (after today)

        CRITICAL RULES FOR DOCTOR IDs (MOST IMPORTANT):
        - When you call get_available_doctors, it returns a JSON response with a "doctors" array and a "valid_ids" array.
        - You MUST parse and REMEMBER the latest "valid_ids" array.
        - You MUST use ONLY the exact IDs from the most recent get_available_doctors response.
        - DO NOT make up, guess, or hallucinate doctor IDs like 1, 6, 101, etc.
        - If the patient mentions a doctor number or ID that is NOT in valid_ids, you MUST say it is invalid and ask them to choose one of the valid IDs instead of calling any tools.
        - When presenting doctors to the patient, always show the ID along with the name so you can reference it later.
        - When calling check_doctor_availability or schedule_appointment, you MUST set doctor_id equal to one of the IDs from the latest valid_ids. If you are not sure, call get_available_doctors again.
        - NEVER use a doctor_id that was not explicitly returned by get_available_doctors.

CRITICAL RULES:
- DO NOT immediately jump to scheduling tools when a patient first describes symptoms
- DO NOT call get_available_doctors or schedule_appointment until you've had a meaningful conversation about their health concern
- DO NOT call handoff_to_doctor if patient wants to schedule - use appointment scheduling instead
- DO NOT call schedule_appointment until ALL steps complete
- ALWAYS wait for patient response between steps
- Use exact IDs: consultation_id={consultation_id}, patient_id={patient_id}
- Be conversational, empathetic, and professional
- Ask clarifying questions before making recommendations

Remember: Your first job is to understand the patient's condition through conversation, not to immediately schedule appointments.""")
        
        # Get tools
        tools = self._create_tools(consultation_id, patient_id)
        llm_with_tools = self.llm.bind_tools(tools)
        
        # Call LLM
        messages = [system_message] + state["messages"]
        response = await llm_with_tools.ainvoke(messages)
        
        return {"messages": [response]}
    
    def _should_continue(self, state: AgentState) -> str:
        """Determine if we should continue to tools or end"""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "continue"
        return "end"
    
    async def process_message(
        self,
        consultation_id: int,
        user_message: str,
        patient_id: int
    ) -> Dict[str, Any]:
        """Process patient message using LangGraph"""
        # Get message history
        messages_result = await self.db.execute(
            select(Message).where(Message.consultation_id == consultation_id)
            .order_by(Message.created_at)
        )
        messages = messages_result.scalars().all()
        
        # Convert to LangChain messages
        langchain_messages = []
        for msg in messages:
            if msg.sender_role == MessageRole.PATIENT:
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.sender_role == MessageRole.AURA_AGENT:
                langchain_messages.append(AIMessage(content=msg.content))
        
        # Add current message
        langchain_messages.append(HumanMessage(content=user_message))
        
        # Rollback any previous failed transaction to ensure clean state
        try:
            await self.db.rollback()
        except:
            pass
        
        # Save user message
        user_msg = Message(
            consultation_id=consultation_id,
            sender_role=MessageRole.PATIENT,
            content=user_message
        )
        self.db.add(user_msg)
        try:
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Failed to save user message: {str(e)}", exc_info=True)
            raise
        
        # Build graph with tools
        tools = self._create_tools(consultation_id, patient_id)
        tool_node = ToolNode(tools)
        
        workflow = StateGraph(AgentState)
        workflow.add_node("agent", self._call_agent)
        workflow.add_node("tools", tool_node)
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges(
            "agent",
            self._should_continue,
            {
                "continue": "tools",
                "end": END
            }
        )
        workflow.add_edge("tools", "agent")
        graph = workflow.compile()
        
        # Initialize state
        initial_state = AgentState(
            messages=langchain_messages,
            consultation_id=consultation_id,
            patient_id=patient_id
        )
        
        # Run graph
        final_state = await graph.ainvoke(initial_state)
        
        # Extract the final AI response (last message that has content)
        content = ""
        tool_calls = []
        
        # Find the last message with content (after tool calls are processed)
        for msg in reversed(final_state["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                content = msg.content
                # Extract tool calls from this message
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tc in msg.tool_calls:
                        tool_calls.append({
                            "tool": tc.get("name", ""),
                            "result": {}
                        })
                break
        
        # If no content but there were tool calls, generate a follow-up
        if not content and tool_calls:
            logger.info("🔄 Generating follow-up response after tool calls")
            # Generate follow-up with tool results
            follow_up_messages = final_state["messages"]
            tools = self._create_tools(consultation_id, patient_id)
            llm_with_tools = self.llm.bind_tools(tools)
            follow_up_response = await llm_with_tools.ainvoke(follow_up_messages)
            if hasattr(follow_up_response, "content") and follow_up_response.content:
                content = follow_up_response.content
        
        # Fallback if still no content
        if not content:
            # Try to extract information from tool results
            for msg in reversed(final_state["messages"]):
                if isinstance(msg, ToolMessage):
                    try:
                        result = json.loads(msg.content)
                        # Check for errors first
                        if "error" in result or result.get("success") == False:
                            error_msg = result.get("error", "An error occurred")
                            content = f"I apologize, but I encountered an issue: {error_msg}. Please try again or select a different option."
                            break
                        # Check for doctor list
                        if "doctors" in result:
                            doctors = result.get("doctors", [])
                            if doctors:
                                doctor_list = "\n".join([f"- {d.get('name', 'Doctor')} (ID: {d.get('id')})" for d in doctors])
                                content = f"I found {len(doctors)} available doctor(s):\n\n{doctor_list}\n\nWhich doctor would you like to schedule an appointment with?"
                                break
                    except:
                        pass
            if not content:
                content = "I've processed your request. How can I help you further?"
        
        # Save AI response
        try:
            # Rollback any previous failed transaction
            await self.db.rollback()
        except:
            pass
        
        ai_msg = Message(
            consultation_id=consultation_id,
            sender_role=MessageRole.AURA_AGENT,
            content=content,
            metadata={"tool_calls": tool_calls}
        )
        self.db.add(ai_msg)
        try:
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Failed to save AI message: {str(e)}", exc_info=True)
            # Don't fail the request, just log the error
        
        return {
            "message": content,
            "tool_calls": tool_calls,
            "risk_assessment": None
        }
