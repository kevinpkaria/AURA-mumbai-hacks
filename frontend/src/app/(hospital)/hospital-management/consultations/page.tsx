"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Activity,
    Clock,
    CheckCircle,
    TrendingUp,
    X,
    MessageSquare,
    AlertCircle,
    BarChart3,
    PieChart,
    Bot,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface RiskAssessment {
    riskLevel: "red" | "orange" | "green";
    needsPhysicalExam: "yes" | "no" | "maybe";
    suggestedDepartment: string;
    doctorLevel: "junior" | "senior";
    reasoning: string;
}

interface Message {
    id: string;
    role: string;
    content: string;
    timestamp: Date | string;
    riskAssessment?: RiskAssessment;
}

interface Consultation {
    id: string;
    patientId: string;
    patientName: string;
    status: string;
    createdAt: string;
    messages: Message[];
}

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [stats, setStats] = React.useState({
        totalPatients: 0,
        totalConsultations: 0,
        pendingConsultations: 0,
        verifiedConsultations: 0,
        completedConsultations: 0,
        totalMessages: 0,
        todayConsultations: 0,
        highRiskCount: 0
    });

    const [ongoingConsultations, setOngoingConsultations] = React.useState<Consultation[]>([]);
    const [completedConsultations, setCompletedConsultations] = React.useState<Consultation[]>([]);
    const [selectedConsultation, setSelectedConsultation] = React.useState<Consultation | null>(null);
    const [activeTab, setActiveTab] = React.useState<"ongoing" | "completed">("ongoing");

    // Filter states
    const [riskFilter, setRiskFilter] = React.useState<"all" | "red" | "orange" | "green" | "unassessed">("all");
    const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
    const [assessmentFilter, setAssessmentFilter] = React.useState<"all" | "assessed" | "unassessed">("all");

    const loadData = React.useCallback(async () => {
        try {
            const consultations = await api.getConsultations();
            
            // Transform backend consultations to frontend format
            const transformedConsultations: Consultation[] = await Promise.all(
                consultations.map(async (c: any) => {
                    // Load messages for each consultation
                    let messages: Message[] = [];
                    try {
                        const msgs = await api.getConsultationMessages(c.id);
                        messages = msgs.map((m: any) => ({
                            id: m.id.toString(),
                            role: m.sender_role === "patient" ? "user" : 
                                  m.sender_role === "aura_agent" ? "ai" : 
                                  m.sender_role === "doctor" ? "doctor_chat" : m.sender_role,
                            content: m.content,
                            timestamp: new Date(m.created_at),
                            riskAssessment: m.metadata?.risk_assessment
                        }));
                    } catch (e) {
                        console.error(`Failed to load messages for consultation ${c.id}:`, e);
                    }

                    return {
                        id: c.id.toString(),
                        patientId: c.patient_id?.toString() || "",
                        patientName: c.patient?.name || `Patient ${c.patient_id}` || "Unknown",
                        status: c.status || "pending",
                        createdAt: c.created_at || new Date().toISOString(),
                        updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
                        messages: messages,
                        aiDiagnosis: c.ai_summary || null
                    };
                })
            );

            // Separate ongoing and completed
            const ongoing = transformedConsultations.filter((c: Consultation) =>
                c.status === "pending" || c.status === "verified" || c.status === "active"
            ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const completed = transformedConsultations.filter((c: Consultation) =>
                c.status === "completed"
            ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setOngoingConsultations(ongoing);
            setCompletedConsultations(completed);

            // Calculate stats
            const uniquePatients = new Set(transformedConsultations.map((c: Consultation) => c.patientId)).size;
            const pending = transformedConsultations.filter((c: Consultation) => c.status === "pending").length;
            const verified = transformedConsultations.filter((c: Consultation) => c.status === "verified").length;
            const completedCount = completed.length;
            const totalMessages = transformedConsultations.reduce((sum: number, c: Consultation) => sum + (c.messages?.length || 0), 0);

            // Count high risk consultations
            const highRisk = transformedConsultations.filter((c: Consultation) => {
                const riskMsg = c.messages?.find((m: Message) => m.role === "risk_assessment");
                return riskMsg?.riskAssessment?.riskLevel === "red";
            }).length;

            // Today's consultations
            const today = new Date().toDateString();
            const todayCount = transformedConsultations.filter((c: Consultation) =>
                new Date(c.createdAt).toDateString() === today
            ).length;

            setStats({
                totalPatients: uniquePatients,
                totalConsultations: transformedConsultations.length,
                pendingConsultations: pending,
                verifiedConsultations: verified,
                completedConsultations: completedCount,
                totalMessages: totalMessages,
                todayConsultations: todayCount,
                highRiskCount: highRisk
            });
        } catch (error) {
            console.error("Failed to load consultations:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Redirect if not authenticated or not admin
    React.useEffect(() => {
        if (!authLoading && !user) {
            const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
            if (currentPath !== "/login") {
                window.location.href = "/login";
            }
        } else if (!authLoading && user && user.role !== "admin") {
            // Redirect non-admins to their appropriate portal
            if (user.role === "patient") {
                window.location.href = "/dashboard";
            } else if (user.role === "doctor") {
                window.location.href = "/portal";
            } else {
                window.location.href = "/login";
            }
        }
    }, [user, authLoading]);

    React.useEffect(() => {
        if (user && user.role === "admin") {
            loadData();
            const interval = setInterval(loadData, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [user, loadData]);

    // Chart data
    const statusData = [
        { name: 'Pending', value: stats.pendingConsultations, color: '#f59e0b' },
        { name: 'Verified', value: stats.verifiedConsultations, color: '#10b981' },
        { name: 'Completed', value: stats.completedConsultations, color: '#6b7280' }
    ];

    const getRiskAssessment = (consultation: Consultation): RiskAssessment | null => {
        const riskMsg = consultation.messages?.find((m: Message) => m.role === "risk_assessment");
        return riskMsg?.riskAssessment || null;
    };

    // Get unique departments from consultations
    const uniqueDepartments = React.useMemo(() => {
        const depts = new Set<string>();
        ongoingConsultations.forEach(c => {
            const risk = getRiskAssessment(c);
            if (risk?.suggestedDepartment) {
                depts.add(risk.suggestedDepartment);
            }
        });
        return Array.from(depts).sort();
    }, [ongoingConsultations]);

    // Filter ongoing consultations
    const filteredOngoingConsultations = React.useMemo(() => {
        return ongoingConsultations.filter(consultation => {
            const riskAssessment = getRiskAssessment(consultation);

            // Risk level filter
            if (riskFilter !== "all") {
                if (riskFilter === "unassessed" && riskAssessment) return false;
                if (riskFilter !== "unassessed" && (!riskAssessment || riskAssessment.riskLevel !== riskFilter)) return false;
            }

            // Department filter
            if (departmentFilter !== "all") {
                if (!riskAssessment || riskAssessment.suggestedDepartment !== departmentFilter) return false;
            }

            // Assessment status filter
            if (assessmentFilter !== "all") {
                const hasAssessment = !!riskAssessment;
                if (assessmentFilter === "assessed" && !hasAssessment) return false;
                if (assessmentFilter === "unassessed" && hasAssessment) return false;
            }

            return true;
        });
    }, [ongoingConsultations, riskFilter, departmentFilter, assessmentFilter]);

    // Show loading while auth is loading
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Don't render if not authenticated or not admin
    if (!user || user.role !== "admin") {
        return null;
    }

    const ConsultationCard = ({ consultation }: { consultation: Consultation }) => {
        const riskAssessment = getRiskAssessment(consultation);

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
            >
                <Card
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                    onClick={() => setSelectedConsultation(consultation)}
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                    {consultation.patientName}
                                    {riskAssessment && (
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-semibold",
                                            riskAssessment.riskLevel === "red"
                                                ? "bg-red-100 text-red-700"
                                                : riskAssessment.riskLevel === "orange"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-green-100 text-green-700"
                                        )}>
                                            {riskAssessment.riskLevel === "red" && "🚨 HIGH RISK"}
                                            {riskAssessment.riskLevel === "orange" && "⚠️ MODERATE"}
                                            {riskAssessment.riskLevel === "green" && "✅ LOW RISK"}
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    {new Date(consultation.createdAt).toLocaleDateString()} • {new Date(consultation.createdAt).toLocaleTimeString()}
                                </CardDescription>
                            </div>
                            <div className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                consultation.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : consultation.status === "verified"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                            )}>
                                {consultation.status}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {riskAssessment && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Department:</span>
                                        <span className="font-medium">{riskAssessment.suggestedDepartment}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Doctor:</span>
                                        <span className="font-medium">
                                            {riskAssessment.doctorLevel === "senior" ? "Senior Specialist" : "Junior Doctor"}
                                        </span>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-1 col-span-2">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{consultation.messages?.length || 0} messages</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading consultations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Hospital Management</h1>
                <p className="text-muted-foreground">Monitor consultations and manage hospital operations</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPatients}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Unique patients
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Consultations</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConsultations}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            +{stats.todayConsultations} today
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.highRiskCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Require immediate attention
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingConsultations}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Awaiting doctor
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Consultations Section */}
            <div>
                {/* Tabs */}
                <div className="flex gap-2 mb-4 border-b">
                    <button
                        onClick={() => setActiveTab("ongoing")}
                        className={cn(
                            "px-4 py-2 font-medium text-sm transition-colors border-b-2",
                            activeTab === "ongoing"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Ongoing Consultations ({ongoingConsultations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={cn(
                            "px-4 py-2 font-medium text-sm transition-colors border-b-2",
                            activeTab === "completed"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Completed Consultations ({completedConsultations.length})
                    </button>
                </div>

                {/* Filters - Only show for Ongoing tab */}
                {activeTab === "ongoing" && (
                    <Card className="mb-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Filters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Risk Level Filter */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Risk Level</label>
                                    <select
                                        value={riskFilter}
                                        onChange={(e) => setRiskFilter(e.target.value as any)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                    >
                                        <option value="all">All Levels</option>
                                        <option value="red">🚨 High Risk</option>
                                        <option value="orange">⚠️ Moderate Risk</option>
                                        <option value="green">✅ Low Risk</option>
                                        <option value="unassessed">Unassessed</option>
                                    </select>
                                </div>

                                {/* Department Filter */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Department</label>
                                    <select
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                    >
                                        <option value="all">All Departments</option>
                                        {uniqueDepartments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Assessment Status Filter */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">AI Assessment</label>
                                    <select
                                        value={assessmentFilter}
                                        onChange={(e) => setAssessmentFilter(e.target.value as any)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                    >
                                        <option value="all">All Consultations</option>
                                        <option value="assessed">AI Assessed</option>
                                        <option value="unassessed">Unassessed</option>
                                    </select>
                                </div>

                                {/* Clear Filters */}
                                <div className="flex items-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setRiskFilter("all");
                                            setDepartmentFilter("all");
                                            setAssessmentFilter("all");
                                        }}
                                        className="w-full"
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </div>

                            {/* Active Filters Summary */}
                            {(riskFilter !== "all" || departmentFilter !== "all" || assessmentFilter !== "all") && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        Showing {filteredOngoingConsultations.length} of {ongoingConsultations.length} consultations
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}


                {/* Consultation Grid */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {activeTab === "ongoing" && filteredOngoingConsultations.map(consultation => (
                            <ConsultationCard key={consultation.id} consultation={consultation} />
                        ))}
                        {activeTab === "completed" && completedConsultations.map(consultation => (
                            <ConsultationCard key={consultation.id} consultation={consultation} />
                        ))}
                    </motion.div>
                </AnimatePresence>

                {activeTab === "ongoing" && filteredOngoingConsultations.length === 0 && ongoingConsultations.length > 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">No consultations match the selected filters</p>
                            <Button
                                variant="link"
                                onClick={() => {
                                    setRiskFilter("all");
                                    setDepartmentFilter("all");
                                    setAssessmentFilter("all");
                                }}
                                className="mt-2"
                            >
                                Clear all filters
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "ongoing" && ongoingConsultations.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">No ongoing consultations</p>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "completed" && completedConsultations.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">No completed consultations</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Consultation Detail Modal */}
            <AnimatePresence>
                {selectedConsultation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedConsultation(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-background rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedConsultation.patientName}</h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Consultation ID: {selectedConsultation.id.slice(0, 16)}... • {new Date(selectedConsultation.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedConsultation(null)}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid md:grid-cols-3 gap-6 p-6">
                                    {/* Risk Assessment Box - Left Side */}
                                    <div className="md:col-span-1">
                                        {(() => {
                                            const riskAssessment = getRiskAssessment(selectedConsultation);
                                            if (!riskAssessment) {
                                                return (
                                                    <Card className="sticky top-0">
                                                        <CardHeader>
                                                            <CardTitle className="text-lg">Risk Assessment</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <p className="text-sm text-muted-foreground">No risk assessment available yet</p>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            }

                                            const riskColors = {
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

                                            const colors = riskColors[riskAssessment.riskLevel];
                                            const riskLabels = {
                                                red: "HIGH RISK",
                                                orange: "MODERATE RISK",
                                                green: "LOW RISK"
                                            };

                                            return (
                                                <div className={cn("border-2 rounded-xl p-5 shadow-lg sticky top-0", colors.bg, colors.border)}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-2xl", colors.badge)}>
                                                            {colors.icon}
                                                        </div>
                                                        <div>
                                                            <h3 className={cn("font-bold text-base", colors.text)}>Risk Assessment</h3>
                                                            <p className={cn("text-xs font-semibold", colors.text)}>{riskLabels[riskAssessment.riskLevel]}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className={cn("text-xs font-semibold mb-1", colors.text)}>Risk Level</p>
                                                            <div className={cn("px-3 py-1.5 rounded-full text-white font-bold text-xs inline-block", colors.badge)}>
                                                                {riskAssessment.riskLevel.toUpperCase()}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className={cn("text-xs font-semibold mb-1", colors.text)}>Physical Exam</p>
                                                            <p className={cn("text-sm", colors.text)}>
                                                                {riskAssessment.needsPhysicalExam.charAt(0).toUpperCase() + riskAssessment.needsPhysicalExam.slice(1)}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className={cn("text-xs font-semibold mb-1", colors.text)}>Department</p>
                                                            <p className={cn("text-sm font-medium", colors.text)}>{riskAssessment.suggestedDepartment}</p>
                                                        </div>

                                                        <div>
                                                            <p className={cn("text-xs font-semibold mb-1", colors.text)}>Recommended Doctor</p>
                                                            <p className={cn("text-sm font-medium", colors.text)}>
                                                                {riskAssessment.doctorLevel === "senior" ? "Senior Specialist" : "Junior Doctor"}
                                                            </p>
                                                        </div>

                                                        <div className={cn("pt-3 border-t", colors.border)}>
                                                            <p className={cn("text-xs font-semibold mb-1", colors.text)}>Assessment</p>
                                                            <p className={cn("text-xs leading-relaxed", colors.text)}>{riskAssessment.reasoning}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Chat History - Right Side */}
                                    <div className="md:col-span-2">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Chat History</CardTitle>
                                                <CardDescription>{selectedConsultation.messages?.length || 0} messages</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                    {selectedConsultation.messages?.map((msg: Message, i: number) => {
                                                        // Skip risk assessment messages in chat (shown in left panel)
                                                        if (msg.role === "risk_assessment") return null;

                                                        return (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    "flex gap-3",
                                                                    msg.role === "user" ? "flex-row-reverse" : ""
                                                                )}
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                                                        msg.role === "user"
                                                                            ? "bg-blue-500 text-white"
                                                                            : msg.role === "doctor_chat"
                                                                                ? "bg-green-600 text-white"
                                                                                : msg.role === "doctor_prescription"
                                                                                    ? "bg-blue-600 text-white"
                                                                                    : "bg-purple-500 text-white"
                                                                    )}
                                                                >
                                                                    {msg.role === "user" ? (
                                                                        <User className="h-4 w-4" />
                                                                    ) : msg.role === "doctor_chat" || msg.role === "doctor_prescription" ? (
                                                                        <span className="text-xs font-bold">Dr</span>
                                                                    ) : (
                                                                        <Bot className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                <div
                                                                    className={cn(
                                                                        "p-3 rounded-lg text-sm max-w-[85%]",
                                                                        msg.role === "user"
                                                                            ? "bg-blue-50 border border-blue-200"
                                                                            : msg.role === "doctor_chat"
                                                                                ? "bg-green-50 border border-green-200"
                                                                                : msg.role === "doctor_prescription"
                                                                                    ? "bg-blue-50 border-2 border-blue-300"
                                                                                    : "bg-purple-50 border border-purple-200"
                                                                    )}
                                                                >
                                                                    {msg.role === "doctor_prescription" && (
                                                                        <div className="text-xs font-semibold text-blue-700 mb-1">📋 Prescription</div>
                                                                    )}
                                                                    {msg.role === "doctor_chat" && (
                                                                        <div className="text-xs font-semibold text-green-700 mb-1">💬 Doctor Message</div>
                                                                    )}
                                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Status:</span>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-medium",
                                            selectedConsultation.status === 'verified'
                                                ? 'bg-green-100 text-green-700'
                                                : selectedConsultation.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-700'
                                        )}>
                                            {selectedConsultation.status}
                                        </span>
                                    </div>
                                    <Button onClick={() => setSelectedConsultation(null)}>
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
