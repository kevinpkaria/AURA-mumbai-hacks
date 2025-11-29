"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/upload/file-uploader";
import { MessageSquare, Clock, FileText, Plus, Activity, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = React.useState<any[]>([]);
    const [metrics, setMetrics] = React.useState<any[]>([]);
    const [surgeAlert, setSurgeAlert] = React.useState<any>(null);
    const [consultations, setConsultations] = React.useState<any[]>([]);
    const [appointments, setAppointments] = React.useState<any[]>([]);
    const [activity, setActivity] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load documents
            const docs = await api.getPatientDocuments(user!.id) as any[];
            setDocuments(docs);

            // Extract metrics from documents
            const allMetrics: any[] = [];
            docs.forEach((doc: any) => {
                if (doc.metrics && Array.isArray(doc.metrics)) {
                    allMetrics.push(...doc.metrics);
                }
            });
            setMetrics(allMetrics.slice(0, 3));

            // Load consultations
            const cons = await api.getConsultations() as any[];
            setConsultations(cons);

            // Load appointments
            try {
                const apts = await api.getAppointments(user!.id) as any[];
                setAppointments(apts);
            } catch (e) {
                console.error("Failed to load appointments:", e);
            }

            // Load activity
            try {
                const act = await api.getPatientActivity(user!.id) as any;
                const activityItems: any[] = [];
                
                // Add document activities
                if (act.documents) {
                    act.documents.forEach((doc: any) => {
                        activityItems.push({
                            type: "document",
                            id: doc.id,
                            title: `Uploaded: ${doc.name}`,
                            date: doc.date,
                            icon: FileText,
                        });
                    });
                }
                
                // Add consultation activities
                if (act.consultations) {
                    act.consultations.forEach((cons: any) => {
                        activityItems.push({
                            type: "consultation",
                            id: cons.id,
                            title: `Consultation ${cons.status}`,
                            date: cons.date,
                            icon: MessageSquare,
                        });
                    });
                }
                
                // Sort by date (newest first)
                activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setActivity(activityItems.slice(0, 10));
            } catch (e) {
                console.error("Failed to load activity:", e);
            }

            // Load surge alert (use user's city if available, default to Delhi)
            try {
                const city = (user as any)?.city || "Delhi";
                const alert = await api.getSurgeAlert(city) as any;
                if (alert && alert.has_alert) {
                    setSurgeAlert(alert);
                }
            } catch (e) {
                console.error("Failed to load surge alert:", e);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadComplete = () => {
        loadData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || "User"}</h1>
                    <p className="text-muted-foreground">Here's an overview of your health status.</p>
                </div>
                <Link href="/chat">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> New Consultation
                    </Button>
                </Link>
            </div>

            {/* Surge Alert Banner */}
            {surgeAlert && surgeAlert.has_alert && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={`border-2 ${
                        surgeAlert.risk_level === "high" ? "border-red-300 bg-red-50" :
                        surgeAlert.risk_level === "medium" ? "border-orange-300 bg-orange-50" :
                        "border-yellow-300 bg-yellow-50"
                    }`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className={`h-5 w-5 ${
                                    surgeAlert.risk_level === "high" ? "text-red-600" :
                                    surgeAlert.risk_level === "medium" ? "text-orange-600" :
                                    "text-yellow-600"
                                }`} />
                                Health Alert - {surgeAlert.risk_level?.toUpperCase()} Risk
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm mb-3">{surgeAlert.message}</p>
                            {surgeAlert.recommendations && (
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {surgeAlert.recommendations.map((rec: string, i: number) => (
                                        <li key={i}>{rec}</li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Health Metrics Section */}
            {metrics.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4 md:grid-cols-3"
                >
                    {metrics.map((metric, i) => (
                        <Card key={i} className="bg-primary/5 border-primary/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-primary">{metric.name || "Metric"}</CardTitle>
                                <Activity className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metric.value} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span></div>
                                <p className="text-xs text-muted-foreground">Extracted from recent report</p>
                            </CardContent>
                        </Card>
                    ))}
                </motion.div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/consultations">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Consultations</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {consultations.filter((c: any) => 
                                    c.status === "pending" || 
                                    c.status === "active" || 
                                    c.status === "doctor_review"
                                ).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {consultations.filter((c: any) => 
                                    c.status === "pending" || 
                                    c.status === "active" || 
                                    c.status === "doctor_review"
                                ).length === 1 ? "1 ongoing consultation" : 
                                `${consultations.filter((c: any) => 
                                    c.status === "pending" || 
                                    c.status === "active" || 
                                    c.status === "doctor_review"
                                ).length} ongoing consultations`}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/documents">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Documents</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{documents.length}</div>
                            <p className="text-xs text-muted-foreground">Stored securely</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/patient-appointments">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {appointments.length > 0 && appointments[0] ? (
                                <>
                                    <div className="text-lg font-bold">
                                        {new Date(appointments[0].datetime).toLocaleDateString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(appointments[0].datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">None</div>
                                    <p className="text-xs text-muted-foreground">Schedule a follow-up</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Quick Upload</CardTitle>
                        <CardDescription>Upload medical reports or prescriptions for analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUploader onUploadComplete={handleUploadComplete} />
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Your latest interactions and updates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                            <AnimatePresence>
                                {activity.length > 0 ? (
                                    activity.map((item, i) => {
                                        const Icon = item.icon || Activity;
                                        return (
                                            <motion.div
                                                key={item.id || i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{item.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        No recent activity. Upload a document or start a consultation to get started.
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
