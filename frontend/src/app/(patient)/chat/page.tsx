"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Loader2, AlertCircle, Clock, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";

interface RiskAssessment {
    riskLevel: "red" | "orange" | "green";
    needsPhysicalExam: "yes" | "no" | "maybe";
    suggestedDepartment: string;
    doctorLevel: "junior" | "senior";
    reasoning: string;
}

interface Message {
    id: string;
    role: "user" | "ai" | "system" | "doctor" | "doctor_chat" | "doctor_prescription" | "risk_assessment";
    content: string;
    timestamp: Date | string;
    riskAssessment?: RiskAssessment;
}

export default function ChatPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState("");
    const [isTyping, setIsTyping] = React.useState(false);
    const [consultationId, setConsultationId] = React.useState<number | null>(null);
    const [allConsultations, setAllConsultations] = React.useState<any[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = React.useState<number | null>(null);
    const [consultationStatus, setConsultationStatus] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [retrying, setRetrying] = React.useState(false);
    const [endingConsultation, setEndingConsultation] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Load consultations on mount
    React.useEffect(() => {
        if (user) {
            // Check if consultation ID is in URL params
            const consultationParam = searchParams.get("consultation");
            if (consultationParam) {
                const consId = parseInt(consultationParam, 10);
                if (!isNaN(consId)) {
                    setConsultationId(consId);
                    // Load consultation to check status
                    loadConsultationDetails(consId);
                    loadMessages(consId);
                    setLoading(false);
                    return;
                }
            }
            loadConsultations();
        } else {
            setLoading(false);
            setError("Please log in to use the chat feature.");
            // Redirect to login after a short delay
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        }
    }, [user, router, searchParams]);

    const createNewConsultation = async (): Promise<boolean> => {
        try {
            console.log("Creating new consultation...");
            const newConsultation = await api.createConsultation() as any;
            console.log("Created consultation:", newConsultation);
            
            if (!newConsultation || !newConsultation.id) {
                throw new Error("Invalid consultation response from server");
            }
            
            setConsultationId(newConsultation.id);
                const initialMessage: Message = {
                    id: "1",
                    role: "ai",
                    content: "Hello! I'm AURA, your health assistant. Please describe your symptoms, and I'll help analyze them for you.",
                    timestamp: new Date(),
                };
                setMessages([initialMessage]);
            setError(null);
            return true;
        } catch (createError: any) {
            console.error("Failed to create consultation:", createError);
            // Extract error message properly
            let errorMsg = "Failed to create consultation. Please check your connection and try again.";
            if (createError?.message) {
                errorMsg = createError.message;
            } else if (typeof createError === "string") {
                errorMsg = createError;
            } else if (createError && typeof createError === "object") {
                errorMsg = createError.message || createError.error || createError.detail || JSON.stringify(createError);
            }
            setError(errorMsg);
            return false;
        }
    };

    const loadConsultations = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // First, try to get existing consultations
            const consultations = await api.getConsultations() as any[];
            setAllConsultations(consultations);
            
            // Find the most recent pending/active consultation or create a new one
            if (!consultationId) {
                const activeConsultation = consultations.find((c: any) => 
                    c.status === "pending" || c.status === "active"
                );
                
                if (activeConsultation) {
                    setConsultationId(activeConsultation.id);
                    await loadMessages(activeConsultation.id);
                } else {
                    // Create a new consultation
                    await createNewConsultation();
                }
            } else {
                await loadMessages(consultationId);
            }
        } catch (error: any) {
            console.error("Failed to load consultations:", error);
            // Extract error message properly
            let errorMsg = "Failed to load consultations. Please check if the backend is running.";
            if (error?.message) {
                errorMsg = error.message;
            } else if (typeof error === "string") {
                errorMsg = error;
            } else if (error && typeof error === "object") {
                errorMsg = error.message || error.error || error.detail || JSON.stringify(error);
            }
            setError(errorMsg);
            
            // If error loading consultations, try to create a new one anyway
            if (user?.id) {
                await createNewConsultation();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        setRetrying(true);
        setError(null);
        await createNewConsultation();
        setRetrying(false);
    };

    const loadMessages = async (consId: number) => {
        try {
            const msgs = await api.getConsultationMessages(consId) as any[];
            setMessages(msgs.map((m: any) => {
                // Map message roles for display
                let role = m.sender_role;
                if (m.sender_role === "patient") {
                    role = "user";
                } else if (m.sender_role === "aura_agent") {
                    role = "ai";
                } else if (m.sender_role === "doctor") {
                    // Check if it's a prescription or regular doctor message
                    if (m.metadata?.type === "prescription") {
                        role = "doctor_prescription";
                    } else {
                        role = "doctor_chat";
                    }
                }
                
                return {
                    id: m.id.toString(),
                    role: role,
                    content: m.content,
                    timestamp: new Date(m.created_at),
                    riskAssessment: m.metadata?.risk_assessment,
                };
            }));
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const loadConsultationDetails = async (consId: number) => {
        try {
            const consultation = await api.getConsultation(consId) as any;
            setConsultationStatus(consultation.status);
            // Only mark as "viewing history" if consultation is completed
            if (consultation.status === "completed") {
                setSelectedHistoryId(consId);
            } else {
                // Allow continuing active consultations
                setSelectedHistoryId(null);
            }
        } catch (error) {
            console.error("Failed to load consultation details:", error);
            // On error, allow continuing anyway
            setSelectedHistoryId(null);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        
        // Allow sending if consultation is not completed
        if (selectedHistoryId && consultationStatus === "completed") {
            // If consultation is completed, ask user if they want to continue
            if (!confirm("This consultation is completed. Do you want to continue this conversation?")) {
                return;
            }
            // Update consultation status to in_progress to allow continuing
            try {
                await api.updateConsultation(selectedHistoryId, { status: "in_progress" });
                setConsultationStatus("in_progress");
                setSelectedHistoryId(null); // Clear history flag to allow messaging
            } catch (error) {
                console.error("Failed to update consultation status:", error);
                alert("Failed to continue consultation. Please try again.");
                return;
            }
        }
        
        // Ensure we have a consultation ID
        if (!consultationId) {
            console.error("No consultation ID available. Creating one...");
            try {
                const newConsultation = await api.createConsultation() as any;
                setConsultationId(newConsultation.id);
                // Retry sending after creating consultation
                setTimeout(() => handleSend(), 100);
                return;
            } catch (error: any) {
                console.error("Failed to create consultation:", error);
                setError("Failed to create consultation. Please refresh the page.");
                return;
            }
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        const messageToSend = input;
        setInput("");
        setIsTyping(true);
        setError(null);

        try {
            console.log("Sending message to API:", { consultationId, message: messageToSend });
            const response = await api.chat(consultationId, messageToSend) as any;
            console.log("Received response:", response);

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: response.response || "I'm sorry, I didn't receive a proper response.",
                timestamp: new Date(),
            };

            let finalMessages = [...newMessages, aiResponse];

            // If risk assessment is present, add it as a separate message
            if (response.risk_assessment) {
                const riskMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    role: "risk_assessment",
                    content: "",
                    timestamp: new Date(),
                    riskAssessment: response.risk_assessment,
                };
                finalMessages = [...finalMessages, riskMessage];
            }

            // Handle tool calls (handoff, appointment scheduling)
            if (response.tool_calls && Array.isArray(response.tool_calls)) {
                response.tool_calls.forEach((toolCall: any) => {
                    // Backend returns {tool: "tool_name", result: {...}}
                    const toolName = toolCall.tool || toolCall.function_name;
                    const toolResult = toolCall.result || {};
                    
                    if (toolName === "handoff_to_doctor" && toolResult.success) {
                        // Doctor handoff triggered - use message from tool result or default
                        const handoffMessage: Message = {
                            id: (Date.now() + 3).toString(),
                            role: "system",
                            content: toolResult.message || "I've requested a doctor to join the chat. A healthcare professional will review your consultation and respond shortly.",
                            timestamp: new Date(),
                        };
                        finalMessages = [...finalMessages, handoffMessage];
                    } else if (toolName === "schedule_appointment") {
                        // Appointment scheduling triggered
                        const appointmentMessage: Message = {
                            id: (Date.now() + 4).toString(),
                            role: "system",
                            content: `Appointment scheduled: ${toolResult.datetime || "Check your appointments page for details"}`,
                            timestamp: new Date(),
                        };
                        finalMessages = [...finalMessages, appointmentMessage];
                    }
                });
            }

            // Handle actions from response
            if (response.actions) {
                if (response.actions.suggest_handoff) {
                    const handoffSuggestion: Message = {
                        id: (Date.now() + 5).toString(),
                        role: "system",
                        content: "AURA suggests connecting you with a doctor. Would you like to proceed?",
                        timestamp: new Date(),
                    };
                    finalMessages = [...finalMessages, handoffSuggestion];
                }
                if (response.actions.suggest_appointment) {
                    const appointmentSuggestion: Message = {
                        id: (Date.now() + 6).toString(),
                        role: "system",
                        content: "AURA suggests scheduling an appointment. Would you like to schedule one?",
                        timestamp: new Date(),
                    };
                    finalMessages = [...finalMessages, appointmentSuggestion];
                }
            }

            setMessages(finalMessages);

        } catch (error: any) {
            console.error("Chat Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: error?.message || "I'm sorry, I encountered an error connecting to the server. Please check if the backend is running and try again.",
                timestamp: new Date(),
            };
            const finalMessages = [...newMessages, errorMsg];
            setMessages(finalMessages);
            setError(error?.message || "Failed to send message. Please check your connection.");
        } finally {
            setIsTyping(false);
        }
    };

    const handleEndConsultation = async () => {
        if (!consultationId || selectedHistoryId) return;
        
        if (!confirm("Are you sure you want to end this consultation? You can view it later in your consultations page.")) {
            return;
        }

        try {
            setEndingConsultation(true);
            await api.updateConsultation(consultationId, { status: "completed" });
            // Redirect to consultations page
            router.push("/consultations");
        } catch (error: any) {
            console.error("Failed to end consultation:", error);
            setError("Failed to end consultation. Please try again.");
            setEndingConsultation(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>;
            case "verified":
                return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified</span>;
            case "completed":
                return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">Completed</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading consultation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-8">
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">AI Consultation</h1>
                               <p className="text-muted-foreground">
                                   {consultationStatus === "completed" ? "This consultation is completed. You can continue the conversation below." : "Describe your symptoms for a preliminary analysis"}
                               </p>
                    </div>
                    {consultationId && !selectedHistoryId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEndConsultation}
                            disabled={endingConsultation}
                            className="gap-2"
                        >
                            {endingConsultation ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Ending...
                                </>
                            ) : (
                                <>
                                    <X className="h-4 w-4" />
                                    End Consultation
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
                                <Button 
                                    onClick={handleRetry} 
                                    disabled={retrying}
                                    size="sm"
                                    variant="outline"
                                    className="text-red-700 border-red-300 hover:bg-red-100"
                                >
                                    {retrying ? (
                                        <>
                                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                            Retrying...
                                        </>
                                    ) : (
                                        "Retry"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <Card className="flex flex-col overflow-hidden border shadow-sm h-[65vh]">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map((message) => {
                            // Check if it's a doctor chat message (GREEN)
                            if (message.role === "doctor_chat") {
                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mx-auto max-w-[90%]"
                                    >
                                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                                                    Dr
                                                </div>
                                                <span className="text-sm font-semibold text-green-800">💬 Doctor's Message</span>
                                            </div>
                                            <div className="text-sm text-green-900 whitespace-pre-wrap">
                                                {message.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            // Check if it's a doctor prescription (BLUE)
                            if (message.role === "doctor_prescription") {
                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mx-auto max-w-[90%]"
                                    >
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                                    Dr
                                                </div>
                                                <span className="text-sm font-semibold text-blue-800">📋 Doctor's Prescription</span>
                                            </div>
                                            <div className="text-sm text-blue-900 whitespace-pre-wrap">
                                                {message.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            // Check if it's a risk assessment message
                            if (message.role === "risk_assessment" && message.riskAssessment) {
                                const { riskLevel: rawRiskLevel, needsPhysicalExam, suggestedDepartment, doctorLevel, reasoning } = message.riskAssessment;

                                // Normalize risk level (handle both "red"/"orange"/"green" and "high"/"moderate"/"low")
                                let riskLevel = rawRiskLevel?.toLowerCase() || "green";
                                if (riskLevel === "high") riskLevel = "red";
                                if (riskLevel === "moderate") riskLevel = "orange";
                                if (riskLevel === "low") riskLevel = "green";
                                
                                // Ensure it's one of the valid values
                                if (!["red", "orange", "green"].includes(riskLevel)) {
                                    riskLevel = "green";
                                }

                                const riskColors: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
                                    red: {
                                        bg: "bg-gradient-to-br from-red-50 to-red-100",
                                        border: "border-red-300",
                                        text: "text-red-900",
                                        badge: "bg-red-600",
                                        icon: "🚨"
                                    },
                                    orange: {
                                        bg: "bg-gradient-to-br from-orange-50 to-orange-100",
                                        border: "border-orange-300",
                                        text: "text-orange-900",
                                        badge: "bg-orange-600",
                                        icon: "⚠️"
                                    },
                                    green: {
                                        bg: "bg-gradient-to-br from-green-50 to-green-100",
                                        border: "border-green-300",
                                        text: "text-green-900",
                                        badge: "bg-green-600",
                                        icon: "✅"
                                    },
                                };

                                const colors = riskColors[riskLevel] || riskColors.green; // Fallback to green if riskLevel is invalid
                                const riskLabels: Record<string, string> = {
                                    red: "HIGH RISK - Immediate Attention",
                                    orange: "MODERATE RISK - See Doctor Soon",
                                    green: "LOW RISK - Monitor Symptoms"
                                };

                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mx-auto max-w-full"
                                    >
                                        <div className={cn("border-2 rounded-xl p-6 shadow-lg", colors.bg, colors.border)}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xl", colors.badge)}>
                                                    {colors.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={cn("font-bold text-lg", colors.text)}>Risk Assessment</h3>
                                                    <p className={cn("text-sm font-semibold", colors.text)}>{riskLabels[riskLevel]}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <div className={cn("px-3 py-1 rounded-full text-white font-semibold text-sm", colors.badge)}>
                                                        {riskLevel.toUpperCase()} RISK
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-semibold text-sm", colors.text)}>Physical Exam Needed:</span>
                                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium bg-white/60", colors.text)}>
                                                        {needsPhysicalExam.charAt(0).toUpperCase() + needsPhysicalExam.slice(1)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-semibold text-sm", colors.text)}>Suggested Department:</span>
                                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium bg-white/60", colors.text)}>
                                                        {suggestedDepartment}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-semibold text-sm", colors.text)}>Recommended Doctor:</span>
                                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium bg-white/60", colors.text)}>
                                                        {doctorLevel === "senior" ? "Senior Specialist" : "Junior Doctor"}
                                                    </span>
                                                </div>

                                                <div className={cn("text-sm mt-3 pt-3 border-t", colors.border)}>
                                                    <p className={cn("font-semibold mb-1", colors.text)}>Assessment:</p>
                                                    <p className={colors.text}>{reasoning}</p>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-current/20">
                                                <p className={cn("text-xs italic", colors.text)}>
                                                    ⚕️ This is an AI-generated preliminary assessment. Please consult with a healthcare professional for proper diagnosis and treatment.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex gap-3 max-w-[80%]",
                                        message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        {message.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                    </div>
                                    <div
                                        className={cn(
                                            "p-3 rounded-lg text-sm",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted rounded-tl-none"
                                        )}
                                    >
                                        {message.role === "ai" ? (
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                        em: ({ children }) => <em className="italic">{children}</em>,
                                                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                                        li: ({ children }) => <li className="ml-2">{children}</li>,
                                                        code: ({ children }) => <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                                        pre: ({ children }) => <pre className="bg-muted-foreground/20 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            message.content
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-3 mr-auto max-w-[80%]"
                            >
                                <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="bg-muted p-3 rounded-lg rounded-tl-none flex items-center gap-1">
                                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-background">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={
                                    (selectedHistoryId && consultationStatus === "completed")
                                        ? "This consultation is completed. Click to continue..." 
                                        : !consultationId 
                                            ? (error ? "Click Retry to initialize..." : "Initializing consultation...") 
                                            : "Type your symptoms here..."
                                }
                                className="flex-1"
                                disabled={isTyping || (selectedHistoryId && consultationStatus === "completed") || !consultationId || loading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey && input.trim() && consultationId && !isTyping && !loading) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button 
                                type="submit" 
                                disabled={!input.trim() || isTyping || (selectedHistoryId && consultationStatus === "completed") || !consultationId || loading}
                                title={!consultationId ? "Waiting for consultation to initialize" : ""}
                            >
                                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}
