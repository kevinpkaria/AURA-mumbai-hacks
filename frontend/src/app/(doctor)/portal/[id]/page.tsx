"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle, User, Bot, ArrowLeft, Loader2, FileText, Send } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ConsultationPage() {
    const params = useParams();
    const router = useRouter();
    const [consultation, setConsultation] = React.useState<any>(null);
    const [enhancedSummary, setEnhancedSummary] = React.useState<any>(null);
    const [loadingSummary, setLoadingSummary] = React.useState(false);
    const [prescription, setPrescription] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [doctorMessage, setDoctorMessage] = React.useState("");
    const chatScrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        loadConsultation();
    }, [params.id]);

    const loadConsultation = async () => {
        try {
            const cons = await api.getConsultation(parseInt(params.id as string));
            setConsultation(cons);
            
            // Load messages
            const msgs = await api.getConsultationMessages(parseInt(params.id as string));
            cons.messages = msgs.map((m: any) => {
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
                    id: m.id,
                    role: role,
                    content: m.content,
                    timestamp: m.created_at,
                };
            });
            
            // Load AI summary from consultation
            if (cons.ai_summary) {
                // ai_summary might be a JSON string or object
                try {
                    const summary = typeof cons.ai_summary === "string" ? JSON.parse(cons.ai_summary) : cons.ai_summary;
                    // Ensure it's a valid object with expected structure
                    if (summary && typeof summary === "object") {
                        setEnhancedSummary(summary);
                    } else {
                        setEnhancedSummary(null);
                    }
                } catch (e) {
                    console.error("Failed to parse AI summary:", e);
                    setEnhancedSummary(null);
                }
            } else {
                setEnhancedSummary(null);
            }
        } catch (error) {
            console.error("Failed to load consultation:", error);
        }
    };

    const generateEnhancedSummary = async (consult: any) => {
        setLoadingSummary(true);
        try {
            const summary = await api.request(`/ai/summary`, {
                method: "POST",
                body: JSON.stringify({ consultation_id: consult.id }),
            });
            // Ensure summary is a valid object
            if (summary && typeof summary === "object" && !Array.isArray(summary)) {
            setEnhancedSummary(summary);
            } else {
                console.error("Invalid summary format:", summary);
                alert("Failed to generate summary: Invalid response format");
            }
            // Reload consultation to get updated ai_summary
            const updated = await api.getConsultation(parseInt(params.id as string));
            setConsultation(updated);
        } catch (error: any) {
            console.error("Failed to generate summary:", error);
            alert(`Failed to generate summary: ${error.message || "Unknown error"}`);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleSendDoctorMessage = async () => {
        if (!doctorMessage.trim()) return;

        try {
            await api.sendDoctorMessage(parseInt(params.id as string), doctorMessage);
            setDoctorMessage("");
            // Reload consultation and messages
            await loadConsultation();
        } catch (error: any) {
            console.error("Failed to send message:", error);
            alert(`Failed to send message: ${error.message || "Unknown error"}`);
        }
    };


    const handleVerify = async () => {
        if (!prescription.trim()) {
            alert("Please enter prescription details");
            return;
        }

        setIsSubmitting(true);

        try {
            // Send prescription via API
            await api.sendPrescription(parseInt(params.id as string), prescription);
            
            setPrescription(""); // Clear the field
            alert("Prescription sent to patient!");
            
            // Reload consultation and messages
            await loadConsultation();
        } catch (error: any) {
            console.error("Failed to send prescription:", error);
            alert(`Failed to send prescription: ${error.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!consultation) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading consultation...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/portal">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Consultation Review</h1>
                    <p className="text-muted-foreground">
                        {consultation.patientName} • {new Date(consultation.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Patient Info & AI Analysis */}
                <div className="md:col-span-2 space-y-6">
                    {/* Enhanced Summary */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                AI Summary
                            </CardTitle>
                            <CardDescription>Key insights from consultation and health records</CardDescription>
                                </div>
                                {!enhancedSummary && !loadingSummary && (
                                    <Button
                                        onClick={() => generateEnhancedSummary(consultation)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        Generate Summary
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingSummary ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">Generating summary...</span>
                                </div>
                            ) : enhancedSummary && typeof enhancedSummary === "object" && !Array.isArray(enhancedSummary) ? (
                                <div className="space-y-4">
                                    {enhancedSummary.overallAssessment != null && (
                                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                            <p className="text-sm font-medium mb-2">Overall Assessment</p>
                                            <p className="text-sm">
                                                {typeof enhancedSummary.overallAssessment === "string" 
                                                    ? enhancedSummary.overallAssessment 
                                                    : typeof enhancedSummary.overallAssessment === "object"
                                                    ? JSON.stringify(enhancedSummary.overallAssessment, null, 2)
                                                    : String(enhancedSummary.overallAssessment)}
                                            </p>
                                        </div>
                                    )}

                                    {Array.isArray(enhancedSummary.patientKeyPoints) && enhancedSummary.patientKeyPoints.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Key Patient Points</p>
                                            <ul className="space-y-1">
                                                {enhancedSummary.patientKeyPoints.map((point: any, i: number) => (
                                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <span className="text-primary mt-1">•</span>
                                                        <span>{typeof point === "string" ? point : typeof point === "object" ? JSON.stringify(point) : String(point)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {Array.isArray(enhancedSummary.aiSuggestions) && enhancedSummary.aiSuggestions.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">AI Suggestions</p>
                                            <ul className="space-y-1">
                                                {enhancedSummary.aiSuggestions.map((suggestion: any, i: number) => (
                                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <span className="text-blue-500 mt-1">→</span>
                                                        <span>{typeof suggestion === "string" ? suggestion : typeof suggestion === "object" ? JSON.stringify(suggestion) : String(suggestion)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {Array.isArray(enhancedSummary.relevantHealthMetrics) && enhancedSummary.relevantHealthMetrics.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Relevant Health Metrics</p>
                                            <div className="space-y-2">
                                                {enhancedSummary.relevantHealthMetrics.map((item: any, i: number) => (
                                                    <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-green-600 mt-0.5">✓</span>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-green-900">
                                                                    {item?.metric != null ? (typeof item.metric === "string" ? item.metric : typeof item.metric === "object" ? JSON.stringify(item.metric) : String(item.metric)) : "N/A"}
                                                                </p>
                                                                {item?.reason != null && (
                                                                    <p className="text-xs text-green-700 mt-1">
                                                                        {typeof item.reason === "string" ? item.reason : typeof item.reason === "object" ? JSON.stringify(item.reason) : String(item.reason)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No summary available</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                Chat Transcript
                            </CardTitle>
                            <CardDescription>Full conversation between patient and AURA AI ({consultation.messages?.length || 0} messages)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg p-4 space-y-4 max-h-[500px] overflow-y-auto bg-muted/30" ref={chatScrollRef}>
                                {consultation.messages && consultation.messages.map((msg: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                    >
                                        <div
                                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : msg.role === "doctor_chat"
                                                    ? "bg-green-600 text-white"
                                                    : msg.role === "doctor_prescription"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-accent text-accent-foreground"
                                                }`}
                                        >
                                            {msg.role === "user" ? (
                                                <User className="h-4 w-4" />
                                            ) : msg.role === "doctor_chat" || msg.role === "doctor_prescription" ? (
                                                "Dr"
                                            ) : (
                                                <Bot className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div
                                            className={`p-3 rounded-lg text-sm max-w-[85%] whitespace-pre-wrap ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : msg.role === "doctor_chat"
                                                    ? "bg-green-50 border-2 border-green-200 text-green-900"
                                                    : msg.role === "doctor_prescription"
                                                        ? "bg-blue-50 border-2 border-blue-200 text-blue-900"
                                                        : "bg-background border rounded-tl-none"
                                                }`}
                                        >
                                            {msg.role === "doctor_prescription" && (
                                                <div className="text-xs font-semibold text-blue-700 mb-1">📋 Prescription</div>
                                            )}
                                            {msg.role === "doctor_chat" && (
                                                <div className="text-xs font-semibold text-green-700 mb-1">💬 Doctor Message</div>
                                            )}
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Doctor Message Input */}
                            <div className="mt-4 pt-4 border-t space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        value={doctorMessage}
                                        onChange={(e) => setDoctorMessage(e.target.value)}
                                        placeholder="Send a message to the patient..."
                                        className="flex-1"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                    handleSendDoctorMessage();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleSendDoctorMessage}
                                        disabled={!doctorMessage.trim()}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <p className="text-muted-foreground">
                                        Messages sent here will appear in <span className="text-green-600 font-semibold">green</span> on the patient's chat
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Doctor Actions */}
                <div className="space-y-6">
                    <Card className="border-primary/20 shadow-lg">
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle>Doctor Verification</CardTitle>
                            <CardDescription>Review and prescribe</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <div
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${consultation.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                        }`}
                                >
                                    {consultation.status === "completed" ? "Verified" : "Pending Review"}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prescription / Medical Advice</label>
                                <textarea
                                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter prescription details and medical advice for the patient..."
                                    value={prescription}
                                    onChange={(e) => setPrescription(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleVerify}
                                disabled={isSubmitting || !prescription.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {consultation.status === "completed" ? "Send Additional Prescription" : "Verify & Send to Patient"}
                                    </>
                                )}
                            </Button>

                            {consultation.status === "completed" && (
                                <div className="text-xs text-muted-foreground text-center">
                                    Verified on {new Date(consultation.updated_at || consultation.created_at).toLocaleDateString()}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Patient Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Patient:</span>{" "}
                                <span className="font-medium">{consultation.patientName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">ID:</span>{" "}
                                <span className="font-mono text-xs">{consultation.patientId}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Messages:</span>{" "}
                                <span className="font-medium">{consultation.messages?.length || 0}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
