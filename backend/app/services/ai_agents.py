"""
AI Agents - Core agentic AI implementation with tool calling
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List, Optional
from openai import OpenAI
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.consultation import Consultation
from app.models.message import Message, MessageRole
from app.models.document import Document
from app.models.user import User
from app.models.appointment import Appointment, AppointmentMode
from datetime import datetime as dt
import json

logger = get_logger("ai_agents")

openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class BaseAgent:
    """Base class for all AI agents"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai_client
    
    async def _call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Route tool calls to appropriate handlers"""
        if tool_name == "handoff_to_doctor":
            return await self._handoff_to_doctor(**kwargs)
        elif tool_name == "schedule_appointment":
            return await self._schedule_appointment(**kwargs)
        elif tool_name == "get_available_doctors":
            return await self._get_available_doctors(**kwargs)
        elif tool_name == "check_doctor_availability":
            return await self._check_doctor_availability(**kwargs)
        elif tool_name == "get_surge_forecast":
            return await self._get_surge_forecast(**kwargs)
        elif tool_name == "fetch_patient_history":
            return await self._fetch_patient_history(**kwargs)
        elif tool_name == "write_doctor_note":
            return await self._write_doctor_note(**kwargs)
        elif tool_name == "update_consultation_status":
            return await self._update_consultation_status(**kwargs)
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    async def _handoff_to_doctor(self, consultation_id: int) -> Dict[str, Any]:
        """Handoff consultation to a doctor"""
        logger.info(f"👨‍⚕️ Handing off consultation {consultation_id} to doctor")
        result = await self.db.execute(
            select(Consultation).where(Consultation.id == consultation_id)
        )
        consultation = result.scalar_one_or_none()
        if consultation:
            consultation.status = "in_progress"
            await self.db.commit()
            logger.info(f"✅ Consultation {consultation_id} escalated to doctor")
            return {"success": True, "message": "I've requested a doctor to join the chat. A healthcare professional will review your consultation and respond shortly."}
        logger.error(f"❌ Consultation {consultation_id} not found for handoff")
        return {"success": False, "error": "Consultation not found"}
    
    async def _schedule_appointment(self, patient_id: int, doctor_id: int, datetime: str, mode: str = "inperson", consultation_id: Optional[int] = None) -> Dict[str, Any]:
        """Schedule an appointment (checks availability first)"""
        try:
            logger.info(f"📅 Scheduling appointment for patient {patient_id} with doctor {doctor_id} at {datetime} (mode: {mode})")
            
            # Parse datetime string
            try:
                appointment_datetime = dt.fromisoformat(datetime.replace('Z', '+00:00'))
            except ValueError:
                # Try without timezone
                appointment_datetime = dt.fromisoformat(datetime)
            
            # Get patient
            patient_result = await self.db.execute(
                select(User).where(User.id == patient_id)
            )
            patient = patient_result.scalar_one_or_none()
            if not patient:
                logger.error(f"❌ Patient {patient_id} not found")
                return {"success": False, "error": "Patient not found"}
            
            # Get doctor
            doctor_result = await self.db.execute(
                select(User).where(User.id == doctor_id)
            )
            doctor = doctor_result.scalar_one_or_none()
            if not doctor:
                logger.error(f"❌ Doctor {doctor_id} not found")
                return {"success": False, "error": "Doctor not found"}
            logger.info(f"👨‍⚕️ Doctor: {doctor.name}")
            
            # Check availability before creating appointment
            from datetime import timedelta
            from sqlalchemy import and_
            end_datetime = appointment_datetime + timedelta(minutes=30)
            conflict_conditions = [
                Appointment.datetime < end_datetime,
                Appointment.datetime + timedelta(minutes=30) > appointment_datetime
            ]
            
            if doctor_id:
                conflict_conditions.append(Appointment.doctor_id == doctor_id)
            conflict_conditions.append(Appointment.patient_id == patient_id)
            
            conflict_result = await self.db.execute(
                select(Appointment).where(and_(*conflict_conditions))
            )
            conflicts = conflict_result.scalars().all()
            
            if conflicts:
                logger.warning(f"⚠️ Cannot schedule: {len(conflicts)} conflict(s) found")
                return {
                    "success": False,
                    "error": f"Time slot is not available. Found {len(conflicts)} conflicting appointment(s)."
                }
            
            # Create appointment record
            appointment_mode = AppointmentMode.ONLINE if mode == "online" else AppointmentMode.IN_PERSON
            new_appointment = Appointment(
                patient_id=patient_id,
                doctor_id=doctor_id,
                consultation_id=consultation_id,
                datetime=appointment_datetime,
                mode=appointment_mode,
                external_link=None  # No longer using external calendar services
            )
            
            self.db.add(new_appointment)
            await self.db.commit()
            await self.db.refresh(new_appointment)
            
            logger.info(f"✅ Appointment {new_appointment.id} created successfully")
            
            return {
                "success": True,
                "appointment_id": new_appointment.id,
                "datetime": datetime,
                "mode": mode
            }
        except Exception as e:
            logger.error(f"❌ Failed to schedule appointment: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _get_available_doctors(self, hospital_id: Optional[int] = None) -> Dict[str, Any]:
        """Get list of available doctors"""
        logger.info(f"👨‍⚕️ Fetching available doctors (hospital_id: {hospital_id})")
        from app.models.user import UserRole
        
        query = select(User).where(User.role == UserRole.DOCTOR)
        if hospital_id:
            query = query.where(User.hospital_id == hospital_id)
        
        result = await self.db.execute(query)
        doctors = result.scalars().all()
        
        doctor_list = [
            {
                "id": doc.id,
                "name": doc.name,
                "email": doc.email,
                "hospital_id": doc.hospital_id
            }
            for doc in doctors
        ]
        
        logger.info(f"✅ Found {len(doctor_list)} doctor(s)")
        return {"doctors": doctor_list, "count": len(doctor_list)}
    
    async def _check_doctor_availability(self, doctor_id: int, date: str, duration_minutes: int = 30) -> Dict[str, Any]:
        """Check a doctor's availability for a specific date and suggest available time slots"""
        logger.info(f"📅 Checking availability for doctor {doctor_id} on {date}")
        from datetime import datetime, timedelta
        from sqlalchemy import and_
        
        # Parse date (expecting YYYY-MM-DD format)
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD"}
        
        # Get doctor's existing appointments for that day
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        result = await self.db.execute(
            select(Appointment).where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.datetime >= start_of_day,
                    Appointment.datetime < end_of_day + timedelta(days=1)
                )
            ).order_by(Appointment.datetime)
        )
        existing_appointments = result.scalars().all()
        
        # Generate available time slots (9 AM to 5 PM, 30-minute slots)
        booked_times = set()
        for apt in existing_appointments:
            apt_time = apt.datetime.time()
            booked_times.add(apt_time)
        
        # Suggest available slots
        available_slots = []
        start_hour = 9
        end_hour = 17
        
        for hour in range(start_hour, end_hour):
            for minute in [0, 30]:
                slot_time = datetime.combine(target_date, datetime.min.time().replace(hour=hour, minute=minute))
                slot_time_str = slot_time.strftime("%H:%M")
                
                # Check if this slot conflicts with existing appointments
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
                        "time": slot_time_str,
                        "formatted": slot_time.strftime("%I:%M %p")
                    })
        
        logger.info(f"✅ Found {len(available_slots)} available slot(s) for doctor {doctor_id}")
        return {
            "doctor_id": doctor_id,
            "date": date,
            "available_slots": available_slots[:10],  # Limit to 10 suggestions
            "total_slots": len(available_slots)
        }
    
    async def _get_surge_forecast(self, city: str, days: int = 7) -> Dict[str, Any]:
        """Get surge forecast for a city"""
        # Would query SurgePrediction table
        return {"forecast": "High respiratory cases expected", "risk_level": "high"}
    
    async def _fetch_patient_history(self, patient_id: int) -> Dict[str, Any]:
        """Fetch patient medical history"""
        # Get documents
        docs_result = await self.db.execute(
            select(Document).where(Document.patient_id == patient_id)
        )
        documents = docs_result.scalars().all()
        
        # Get consultations
        cons_result = await self.db.execute(
            select(Consultation).where(Consultation.patient_id == patient_id)
        )
        consultations = cons_result.scalars().all()
        
        return {
            "documents": [{"name": d.name, "summary": d.summary} for d in documents],
            "consultations": len(consultations)
        }
    
    async def _write_doctor_note(self, consultation_id: int, note: str) -> Dict[str, Any]:
        """Write a doctor note"""
        return {"success": True, "note": note}
    
    async def _update_consultation_status(self, consultation_id: int, status: str) -> Dict[str, Any]:
        """Update consultation status"""
        result = await self.db.execute(
            select(Consultation).where(Consultation.id == consultation_id)
        )
        consultation = result.scalar_one_or_none()
        if consultation:
            consultation.status = status
            await self.db.commit()
            return {"success": True}
        return {"success": False}


class PatientAgent(BaseAgent):
    """AURA Patient Agent - handles patient consultations with tool calling"""
    
    TOOLS = [
        {
            "type": "function",
            "function": {
                "name": "handoff_to_doctor",
                "description": "ONLY escalate consultation to a human doctor when symptoms are serious (chest pain, difficulty breathing, severe pain) or patient explicitly requests to speak with a doctor. DO NOT use this if patient wants to schedule an appointment - use the appointment scheduling flow instead.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "consultation_id": {"type": "integer", "description": "The consultation ID to escalate"}
                    },
                    "required": ["consultation_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_available_doctors",
                "description": "STRICT: ONLY call this when patient explicitly says they want to schedule/book/make an appointment. This is STEP 1 of appointment scheduling. Call this FIRST, then wait for patient to select a doctor. Do NOT call any other tools in the same response.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "hospital_id": {"type": "integer", "description": "Optional hospital ID to filter doctors"}
                    },
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "check_doctor_availability",
                "description": "STRICT: ONLY call this AFTER: 1) patient has selected a specific doctor (by name or ID), AND 2) patient has provided a preferred date. This is STEP 3 of appointment scheduling. Do NOT call this until both doctor and date are confirmed by the patient.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doctor_id": {"type": "integer", "description": "The doctor ID that the patient selected"},
                        "date": {"type": "string", "description": "Date in YYYY-MM-DD format that the patient provided"},
                        "duration_minutes": {"type": "integer", "description": "Appointment duration in minutes", "default": 30}
                    },
                    "required": ["doctor_id", "date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "schedule_appointment",
                "description": "STRICT: ONLY call this as the FINAL step (STEP 7) AFTER: 1) patient selected a doctor, 2) patient selected a date, 3) you called check_doctor_availability and showed time slots, 4) patient selected a specific time slot, 5) you suggested online/in-person and patient confirmed, 6) you provided a summary and patient said 'yes', 'confirm', 'proceed', or 'schedule it'. DO NOT call this until ALL previous steps are complete and patient has explicitly confirmed.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {"type": "integer", "description": "MUST use the exact patient_id from context"},
                        "doctor_id": {"type": "integer", "description": "The doctor ID that the patient selected"},
                        "datetime": {"type": "string", "description": "ISO datetime string combining the selected date and time (e.g., '2024-01-15T10:00:00')"},
                        "mode": {"type": "string", "enum": ["online", "inperson"], "description": "Appointment mode - 'online' for video calls, 'inperson' for in-person visits"},
                        "consultation_id": {"type": "integer", "description": "MUST include the consultation_id from context"}
                    },
                    "required": ["patient_id", "doctor_id", "datetime", "mode"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "fetch_patient_history",
                "description": "Retrieve patient's medical history including documents and past consultations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {"type": "integer"}
                    },
                    "required": ["patient_id"]
                }
            }
        }
    ]
    
    async def process_message(
        self,
        consultation_id: int,
        user_message: str,
        patient_id: int
    ) -> Dict[str, Any]:
        """Process patient message with agentic reasoning and tool calling"""
        # Get consultation and message history
        result = await self.db.execute(
            select(Consultation).where(Consultation.id == consultation_id)
        )
        consultation = result.scalar_one_or_none()
        if not consultation:
            raise ValueError("Consultation not found")
        
        # Get message history
        messages_result = await self.db.execute(
            select(Message).where(Message.consultation_id == consultation_id)
            .order_by(Message.created_at)
        )
        messages = messages_result.scalars().all()
        
        # Get patient history
        history = await self._fetch_patient_history(patient_id)
        
        # Build conversation context
        conversation = [
            {
                "role": "system",
                "content": f"""You are AURA, an advanced medical AI assistant with autonomous decision-making capabilities.

CURRENT CONTEXT:
- Consultation ID: {consultation_id}
- Patient ID: {patient_id}

You have access to the patient's medical history:
{json.dumps(history, indent=2)}

=== STRICT TOOL CALLING RULES - FOLLOW THESE EXACTLY ===

1. HANDOFF_TO_DOCTOR:
   - ONLY call when: symptoms are SERIOUS (chest pain, difficulty breathing, severe pain, emergency situations)
   - OR when patient EXPLICITLY says "I want to speak with a doctor" or "transfer me to a doctor"
   - NEVER call if patient says "schedule appointment", "book appointment", "make appointment", "i want an appointment"
   - Always use: consultation_id={consultation_id}

2. APPOINTMENT SCHEDULING - STRICT SEQUENCE (DO NOT SKIP STEPS):
   When patient mentions wanting to schedule/book/make an appointment:
   
   STEP 1: Call get_available_doctors (NO OTHER TOOLS YET)
   - Present the list of doctors to the patient
   - Wait for patient to SELECT a doctor by name or ID
   
   STEP 2: Ask for preferred date
   - Ask: "What date would you prefer? (e.g., 2024-01-15)"
   - Wait for patient to provide a date
   
   STEP 3: Call check_doctor_availability (ONLY after doctor and date are selected)
   - Use the doctor_id the patient selected
   - Use the date the patient provided
   - Present available time slots to the patient
   
   STEP 4: Ask patient to select a time slot
   - Show the available slots
   - Wait for patient to SELECT a specific time
   
   STEP 5: Suggest appointment mode (online/in-person)
   - Suggest ONLINE for: follow-ups, minor issues, medication reviews, routine checkups
   - Suggest IN-PERSON for: physical exams, serious symptoms, first-time visits
   - Ask: "Would you prefer an online video call or in-person visit? I suggest [your suggestion]."
   - Wait for patient CONFIRMATION
   
   STEP 6: Provide summary and ask for final confirmation
   - Show: "Appointment Summary: Doctor: [Name], Date: [Date], Time: [Time], Mode: [Online/In-Person]"
   - Ask: "Should I proceed with scheduling this appointment?"
   - Wait for patient to say "yes", "confirm", "proceed", "schedule it"
   
   STEP 7: ONLY NOW call schedule_appointment
   - patient_id={patient_id} (MUST use this exact value)
   - doctor_id (the doctor patient selected)
   - datetime (ISO format from selected date + time)
   - mode ("online" or "inperson" as confirmed)
   - consultation_id={consultation_id} (MUST include this)

3. FETCH_PATIENT_HISTORY:
   - Only call if you need additional context not already provided
   - Patient history is already provided above, so rarely needed

CRITICAL RULES:
- DO NOT call multiple tools in one response unless explicitly instructed
- DO NOT call schedule_appointment until ALL steps are complete and patient has confirmed
- DO NOT call handoff_to_doctor when patient wants to schedule - use appointment flow instead
- ALWAYS wait for patient response between tool calls
- ALWAYS use exact IDs: consultation_id={consultation_id}, patient_id={patient_id}

After collecting sufficient information (typically 3-4 exchanges), generate a risk assessment:
---RISK_ASSESSMENT---
RISK_LEVEL: [red|orange|green]
PHYSICAL_EXAM: [yes|no|maybe]
DEPARTMENT: [Department Name]
DOCTOR_LEVEL: [junior|senior]
REASONING: [2-3 sentence explanation]
---END_ASSESSMENT---

=== EXAMPLES OF CORRECT BEHAVIOR ===

Example 1 - Patient wants to schedule:
Patient: "i want to schedule an appointment"
You: [Call get_available_doctors tool]
Then: "I found X available doctors. Here are your options: [list doctors]. Which doctor would you like to schedule with?"

Example 2 - Patient selects doctor:
Patient: "Doctor Smith" or "the first one" or "ID 5"
You: "Great! What date would work for you? (e.g., 2024-12-15)"
[Wait for date, then call check_doctor_availability]

Example 3 - Wrong behavior (DO NOT DO THIS):
Patient: "schedule appointment"
You: [DO NOT call handoff_to_doctor] ❌
You: [DO call get_available_doctors] ✅

=== REMEMBER ===
- Be conversational, empathetic, and professional
- Follow the strict tool calling sequence above
- ONE tool call per response (unless explicitly needed)
- Always wait for patient confirmation before proceeding
- Use the exact IDs: consultation_id={consultation_id}, patient_id={patient_id}"""
            }
        ]
        
        # Add message history
        for msg in messages:
            if msg.sender_role == MessageRole.PATIENT:
                conversation.append({"role": "user", "content": msg.content})
            elif msg.sender_role == MessageRole.AURA_AGENT:
                conversation.append({"role": "assistant", "content": msg.content})
        
        # Add current message
        conversation.append({"role": "user", "content": user_message})
        
        # Save user message
        user_msg = Message(
            consultation_id=consultation_id,
            sender_role=MessageRole.PATIENT,
            content=user_message
        )
        self.db.add(user_msg)
        await self.db.commit()
        
        # Call OpenAI with tool calling - enhanced configuration
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=conversation,
                tools=self.TOOLS,
                tool_choice="auto",
                temperature=0.7,  # Balanced creativity and consistency
                max_tokens=2000,  # Ensure enough tokens for complete responses
                top_p=0.9,  # Nucleus sampling for better quality
                frequency_penalty=0.0,  # Don't penalize repetition (helps with instructions)
                presence_penalty=0.1,  # Slight penalty to encourage new topics
            )
        except Exception as e:
            logger.error(f"❌ OpenAI API error: {str(e)}", exc_info=True)
            # Return a helpful error message
            return {
                "message": "I'm experiencing a technical issue. Please try again in a moment.",
                "tool_calls": [],
                "risk_assessment": None
            }
        
        assistant_message = response.choices[0].message
        tool_calls = []
        risk_assessment = None
        
        # Handle tool calls
        if assistant_message.tool_calls:
            logger.info(f"🔧 Processing {len(assistant_message.tool_calls)} tool call(s)")
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                logger.info(f"🔨 Calling tool: {tool_name} with args: {tool_args}")
                
                # Validate and correct IDs to prevent AI from using wrong values
                if tool_name == "handoff_to_doctor":
                    # Always use the correct consultation_id
                    if "consultation_id" in tool_args and tool_args["consultation_id"] != consultation_id:
                        logger.warning(f"⚠️ AI provided wrong consultation_id {tool_args['consultation_id']}, correcting to {consultation_id}")
                    tool_args["consultation_id"] = consultation_id
                elif tool_name == "schedule_appointment":
                    # Always use the correct patient_id and consultation_id
                    if "patient_id" in tool_args and tool_args["patient_id"] != patient_id:
                        logger.warning(f"⚠️ AI provided wrong patient_id {tool_args['patient_id']}, correcting to {patient_id}")
                    tool_args["patient_id"] = patient_id
                    # doctor_id is required and should be provided by AI from the conversation
                    if "doctor_id" not in tool_args:
                        logger.error("❌ AI did not provide doctor_id for schedule_appointment")
                        tool_result = {"success": False, "error": "Doctor ID is required. Please select a doctor first."}
                        tool_calls.append({
                            "tool": tool_name,
                            "result": tool_result
                        })
                        continue
                    if consultation_id and "consultation_id" not in tool_args:
                        tool_args["consultation_id"] = consultation_id
                    elif "consultation_id" in tool_args and tool_args["consultation_id"] != consultation_id:
                        logger.warning(f"⚠️ AI provided wrong consultation_id {tool_args['consultation_id']}, correcting to {consultation_id}")
                        tool_args["consultation_id"] = consultation_id
                
                tool_result = await self._call_tool(tool_name, **tool_args)
                logger.info(f"✅ Tool {tool_name} result: {tool_result.get('success', 'unknown')}")
                tool_calls.append({
                    "tool": tool_name,
                    "result": tool_result
                })
        
        # If tool was called, we might need to generate a follow-up response
        # This helps the AI explain what it did and continue the conversation
        if tool_calls and not assistant_message.content:
            # Generate a follow-up message explaining the tool result
            follow_up_messages = conversation + [
                {"role": "assistant", "content": None, "tool_calls": assistant_message.tool_calls},
                {"role": "tool", "tool_call_id": assistant_message.tool_calls[0].id, "content": json.dumps(tool_calls[0]["result"])}
            ]
            
            try:
                follow_up_response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=follow_up_messages,
                    temperature=0.7,
                    max_tokens=1000,
                )
                assistant_message.content = follow_up_response.choices[0].message.content
                logger.info(f"💬 AI follow-up after tool call: {assistant_message.content[:100]}...")
            except Exception as e:
                logger.error(f"❌ Failed to generate follow-up: {str(e)}", exc_info=True)
                # Fallback message
                if tool_calls[0]["tool"] == "get_available_doctors":
                    doctors = tool_calls[0]["result"].get("doctors", [])
                    if doctors:
                        doctor_list = "\n".join([f"- {d.get('name', 'Doctor')} (ID: {d.get('id')})" for d in doctors])
                        assistant_message.content = f"I found {len(doctors)} available doctor(s):\n\n{doctor_list}\n\nWhich doctor would you like to schedule an appointment with?"
                    else:
                        assistant_message.content = "I couldn't find any available doctors at the moment. Please try again later."
        
        # Extract risk assessment if present
        content = assistant_message.content or ""
        if "---RISK_ASSESSMENT---" in content:
            import re
            assessment_match = re.search(r"---RISK_ASSESSMENT---([\s\S]*?)---END_ASSESSMENT---", content)
            if assessment_match:
                # Parse risk assessment
                risk_assessment = self._parse_risk_assessment(assessment_match.group(1))
                logger.info(f"📊 Risk assessment: {risk_assessment.get('risk_level', 'unknown')} - {risk_assessment.get('suggested_department', 'N/A')}")
                content = content.replace(assessment_match.group(0), "").strip()
        
        # Save AI response
        ai_msg = Message(
            consultation_id=consultation_id,
            sender_role=MessageRole.AURA_AGENT,
            content=content,
            metadata={"tool_calls": tool_calls, "risk_assessment": risk_assessment}
        )
        self.db.add(ai_msg)
        
        # Update consultation with risk assessment
        if risk_assessment:
            consultation.risk_assessment = risk_assessment
            await self.db.commit()
        
        await self.db.commit()
        
        return {
            "response": content,
            "risk_assessment": risk_assessment,
            "tool_calls": tool_calls
        }
    
    def _parse_risk_assessment(self, text: str) -> Dict[str, Any]:
        """Parse risk assessment from text"""
        import re
        return {
            "risk_level": re.search(r"RISK_LEVEL:\s*(\w+)", text, re.I).group(1).lower() if re.search(r"RISK_LEVEL:", text, re.I) else None,
            "needs_physical_exam": re.search(r"PHYSICAL_EXAM:\s*(\w+)", text, re.I).group(1).lower() if re.search(r"PHYSICAL_EXAM:", text, re.I) else None,
            "suggested_department": re.search(r"DEPARTMENT:\s*([^\n]+)", text).group(1).strip() if re.search(r"DEPARTMENT:", text) else None,
            "doctor_level": re.search(r"DOCTOR_LEVEL:\s*(\w+)", text, re.I).group(1).lower() if re.search(r"DOCTOR_LEVEL:", text, re.I) else None,
            "reasoning": re.search(r"REASONING:\s*([^\n]+(?:\n(?!---)[^\n]+)*)", text).group(1).strip() if re.search(r"REASONING:", text) else None,
        }


class DoctorAgent(BaseAgent):
    """AURA Doctor Agent - assists doctors with @aura commands"""
    
    async def process_command(
        self,
        consultation_id: int,
        command: str,
        doctor_id: int
    ) -> Dict[str, Any]:
        """Process @aura command from doctor"""
        if "summarize" in command.lower():
            return await self.generate_summary(consultation_id)
        elif "schedule" in command.lower() or "follow-up" in command.lower():
            # Extract datetime from command and schedule
            return {"message": "Appointment scheduling via command - implementation needed"}
        elif "fetch" in command.lower() or "reports" in command.lower():
            # Fetch latest documents
            return {"message": "Fetching latest reports - implementation needed"}
        else:
            return {"message": "Unknown command. Available: @aura summarize, @aura schedule follow-up, @aura fetch latest reports"}
    
    async def generate_summary(self, consultation_id: int) -> Dict[str, Any]:
        """Generate enhanced summary for doctor"""
        # Get consultation and messages
        result = await self.db.execute(
            select(Consultation).where(Consultation.id == consultation_id)
        )
        consultation = result.scalar_one_or_none()
        
        messages_result = await self.db.execute(
            select(Message).where(Message.consultation_id == consultation_id)
            .order_by(Message.created_at)
        )
        messages = messages_result.scalars().all()
        
        # Get patient documents
        docs_result = await self.db.execute(
            select(Document).where(Document.patient_id == consultation.patient_id)
        )
        documents = docs_result.scalars().all()
        
        # Generate summary with GPT
        conversation_text = "\n".join([f"{m.sender_role}: {m.content}" for m in messages])
        docs_text = "\n".join([f"{d.name}: {d.summary}" for d in documents])
        
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical assistant helping doctors review consultations. Generate a comprehensive summary in JSON format."
                },
                {
                    "role": "user",
                    "content": f"Conversation:\n{conversation_text}\n\nPatient Documents:\n{docs_text}\n\nGenerate a structured summary in JSON format with fields like overallAssessment, patientKeyPoints (list), aiSuggestions (list), relevantHealthMetrics (list of objects with metric and reason fields)."
                }
            ],
            response_format={"type": "json_object"}
        )
        
        summary = json.loads(response.choices[0].message.content)
        consultation.ai_summary = summary
        await self.db.commit()
        
        return summary


class SurgeAgent(BaseAgent):
    """AURA Surge Agent - predicts patient surges"""
    
    async def compute_daily_predictions(self, city: str = "Delhi") -> Dict[str, Any]:
        """Compute daily surge predictions"""
        # This would:
        # 1. Fetch external data (AQI, weather, festivals)
        # 2. Analyze historical consultation patterns
        # 3. Use AI to predict surges
        # 4. Store in SurgePrediction table
        return {"status": "computed", "city": city}


class AdminAgent(BaseAgent):
    """AURA Admin Agent - answers admin queries"""
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """Process admin natural language query"""
        # Use GPT to answer questions about hospital operations, surge predictions, etc.
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are AURA Admin Agent. Answer questions about hospital operations, patient loads, surge predictions, and resource management."
                },
                {
                    "role": "user",
                    "content": query
                }
            ]
        )
        
        return {
            "answer": response.choices[0].message.content,
            "query": query
        }

