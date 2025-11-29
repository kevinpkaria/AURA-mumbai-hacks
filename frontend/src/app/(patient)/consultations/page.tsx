"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, CheckCircle, AlertCircle, ArrowRight, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function ConsultationsPage() {
    const { user } = useAuth();
    const [consultations, setConsultations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [deletingId, setDeletingId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (user) {
            loadConsultations();
        }
    }, [user]);

    const loadConsultations = async () => {
        try {
            setLoading(true);
            const cons = await api.getConsultations() as any[];
            setConsultations(cons);
        } catch (error) {
            console.error("Failed to load consultations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (consultationId: number) => {
        if (!confirm("Are you sure you want to delete this consultation? This action cannot be undone.")) {
            return;
        }

        try {
            setDeletingId(consultationId);
            await api.deleteConsultation(consultationId);
            // Remove from local state
            setConsultations(consultations.filter(c => c.id !== consultationId));
        } catch (error: any) {
            console.error("Failed to delete consultation:", error);
            alert(`Failed to delete consultation: ${error.message || "Unknown error"}`);
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-700";
            case "active":
            case "doctor_review":
                return "bg-blue-100 text-blue-700";
            case "pending":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getRiskColor = (riskLevel?: string) => {
        switch (riskLevel) {
            case "high":
            case "red":
                return "bg-red-100 text-red-700 border-red-300";
            case "moderate":
            case "orange":
                return "bg-orange-100 text-orange-700 border-orange-300";
            case "low":
            case "green":
                return "bg-green-100 text-green-700 border-green-300";
            default:
                return "bg-gray-100 text-gray-700 border-gray-300";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
                    <p className="text-muted-foreground">View and manage your consultations</p>
                </div>
                <Link href="/chat">
                    <Button className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        New Consultation
                    </Button>
                </Link>
            </div>

            {consultations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Consultations Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Start a new consultation to chat with AURA about your health concerns.
                        </p>
                        <Link href="/chat">
                            <Button>
                                Start New Consultation
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {consultations.map((consultation: any) => {
                        const riskAssessment = consultation.risk_assessment || consultation.ai_summary?.risk_assessment;
                        const riskLevel = riskAssessment?.risk_level || riskAssessment?.severity;
                        const lastMessage = consultation.ai_summary?.last_message || "No messages yet";
                        
                        return (
                            <motion.div
                                key={consultation.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <CardTitle className="text-lg">
                                                        Consultation #{consultation.id}
                                                    </CardTitle>
                                                    <span className={cn(
                                                        "text-xs px-2 py-1 rounded-full font-medium",
                                                        getStatusColor(consultation.status)
                                                    )}>
                                                        {consultation.status}
                                                    </span>
                                                    {riskLevel && (
                                                        <span className={cn(
                                                            "text-xs px-2 py-1 rounded-full font-medium border",
                                                            getRiskColor(riskLevel)
                                                        )}>
                                                            {riskLevel === "high" || riskLevel === "red" ? "🚨 High Risk" :
                                                             riskLevel === "moderate" || riskLevel === "orange" ? "⚠️ Moderate" :
                                                             "✅ Low Risk"}
                                                        </span>
                                                    )}
                                                </div>
                                                <CardDescription>
                                                    Created {new Date(consultation.created_at).toLocaleDateString()} at {new Date(consultation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {consultation.doctor_id && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <span className="text-muted-foreground">
                                                        Assigned to doctor
                                                    </span>
                                                </div>
                                            )}
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {lastMessage}
                                            </p>
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="h-4 w-4" />
                                                        {consultation.message_count || 0} messages
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(consultation.id)}
                                                        disabled={deletingId === consultation.id}
                                                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        {deletingId === consultation.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Link href={`/chat?consultation=${consultation.id}`}>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            {consultation.status === "completed" ? "View Summary" : "Continue Consultation"}
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

