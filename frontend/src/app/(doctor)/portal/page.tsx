"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, CheckCircle, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PortalPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [consultations, setConsultations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Redirect to login ONLY if auth has finished loading and there's definitely no auth
    React.useEffect(() => {
        if (!authLoading && !user) {
            const storedUser = typeof window !== "undefined" ? localStorage.getItem("aura_user") : null;
            if (!storedUser) {
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                if (currentPath !== "/login") {
                    console.log("No auth found, redirecting to login");
                    window.location.href = "/login";
                }
            }
        }
    }, [user, authLoading]);

    const loadConsultations = React.useCallback(async () => {
        // Don't load if no user or auth still loading
        if (!user || authLoading) {
            setLoading(false);
            return;
        }

        // Double-check user role matches doctor
        if (user.role !== "doctor") {
            console.warn("User is not a doctor, redirecting...");
            const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
            if (currentPath !== "/login") {
                window.location.href = "/login";
            }
            setLoading(false);
            return;
        }

        try {
            const consultationsData = await api.getConsultations();
            
            // Transform backend consultations to frontend format
            const transformed = consultationsData.map((c: any) => {
                // Extract a string from ai_summary if it's an object
                let aiDiagnosisText = null;
                if (c.ai_summary) {
                    if (typeof c.ai_summary === "string") {
                        try {
                            const parsed = JSON.parse(c.ai_summary);
                            if (parsed && typeof parsed === "object") {
                                aiDiagnosisText = parsed.overallAssessment || JSON.stringify(parsed);
                            } else {
                                aiDiagnosisText = c.ai_summary;
                            }
                        } catch {
                            aiDiagnosisText = c.ai_summary;
                        }
                    } else if (typeof c.ai_summary === "object") {
                        aiDiagnosisText = c.ai_summary.overallAssessment || JSON.stringify(c.ai_summary);
                    }
                }
                
                return {
                    id: c.id.toString(),
                    patientId: c.patient_id?.toString() || "",
                    patientName: c.patient?.name || `Patient ${c.patient_id}` || "Unknown",
                    status: c.status || "pending",
                    createdAt: c.created_at || new Date().toISOString(),
                    updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
                    messageCount: c.message_count || 0,
                    aiDiagnosis: aiDiagnosisText
                };
            });

            // Sort by most recent first
            const sortedConsultations = transformed.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setConsultations(sortedConsultations);
        } catch (error: any) {
            console.error("Failed to load consultations:", error);
            // If authentication error, clear auth and redirect
            if (error?.message?.includes("401") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid authentication")) {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("aura_token");
                    localStorage.removeItem("aura_user");
                    window.location.href = "/login";
                }
            }
        } finally {
            setLoading(false);
        }
    }, [user, router]);

    React.useEffect(() => {
        // Only load if user is authenticated and auth has finished loading
        if (user && !authLoading && user.role === "doctor") {
            // Load immediately
        loadConsultations();

            // Poll every 5 seconds
            const interval = setInterval(() => {
                const currentUser = typeof window !== "undefined" ? localStorage.getItem("aura_user") : null;
                if (currentUser) {
                    loadConsultations();
                }
            }, 5000);
            
            return () => {
                clearInterval(interval);
            };
        }
    }, [user, authLoading, loadConsultations]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case "pending":
                return {
                    label: "Pending Review",
                    icon: Clock,
                    color: "text-yellow-600 bg-yellow-50",
                };
            case "verified":
                return {
                    label: "Verified",
                    icon: CheckCircle,
                    color: "text-green-600 bg-green-50",
                };
            default:
                return {
                    label: "Unknown",
                    icon: AlertCircle,
                    color: "text-gray-600 bg-gray-50",
                };
        }
    };

    // Show loading while checking auth or loading data
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading consultations...</p>
                </div>
            </div>
        );
    }

    // Don't render if no user (will redirect)
    if (!user) {
        return null;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Patient Queue</h1>
                <p className="text-muted-foreground">Review AI consultations and verify diagnoses.</p>
            </div>

            {consultations.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <User className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No Consultations Yet</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            When patients start AI consultations, they will appear here for review.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {consultations.map((consultation, i) => {
                        const statusInfo = getStatusInfo(consultation.status);
                        const StatusIcon = statusInfo.icon;
                        const messageCount = consultation.messageCount || 0;
                        const lastMessage = new Date(consultation.updatedAt || consultation.createdAt).toLocaleString();

                        return (
                            <motion.div
                                key={consultation.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <CardTitle className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    {consultation.patientName}
                                                </CardTitle>
                                                <CardDescription>
                                                    <span className="font-mono text-xs">{consultation.id}</span>
                                                </CardDescription>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium ${statusInfo.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusInfo.label}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Messages</p>
                                                    <p className="font-medium">{messageCount} messages</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Last Activity</p>
                                                    <p className="font-medium">{lastMessage}</p>
                                                </div>
                                            </div>

                                            {consultation.aiDiagnosis && typeof consultation.aiDiagnosis === "string" && (
                                                <div className="bg-muted/50 p-3 rounded-lg">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                                                    <p className="text-sm line-clamp-2">{consultation.aiDiagnosis}</p>
                                                </div>
                                            )}

                                            <Link href={`/portal/${consultation.id}`}>
                                                <Button className="w-full">Review Consultation</Button>
                                            </Link>
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
