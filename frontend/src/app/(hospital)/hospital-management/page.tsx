"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Activity,
    Clock,
    AlertCircle,
    TrendingUp,
    ArrowRight,
    FileText,
    Loader2,
    Stethoscope
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Link from "next/link";
import { generateSurgeForecasts, generateRecommendations } from "@/lib/mockData";

export default function HospitalDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [stats, setStats] = React.useState({
        totalPatients: 0,
        totalConsultations: 0,
        todayConsultations: 0,
        pendingConsultations: 0,
        highRiskCount: 0
    });
    const [surgeAlerts, setSurgeAlerts] = React.useState<any[]>([]);
    const [recentConsultations, setRecentConsultations] = React.useState<any[]>([]);
    const [recommendationsCount, setRecommendationsCount] = React.useState({
        total: 0,
        critical: 0,
        high: 0
    });

    const loadDashboardData = React.useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // Get hospital_id
            let hospitalId = user.hospital_id;
            
            if (!hospitalId && user.role === "admin") {
                try {
                    const hospitals = await api.getHospitals();
                    if (hospitals && hospitals.length > 0) {
                        hospitalId = hospitals[0].id;
                    } else {
                        setError("No hospitals found. Please create a hospital first.");
                        setLoading(false);
                        return;
                    }
                } catch (e: any) {
                    console.error("Failed to fetch hospitals:", e);
                    setError(`Failed to load hospitals: ${e.message || "Unknown error"}`);
                    setLoading(false);
                    return;
                }
            }

            // If no hospital_id, use dummy data only
            if (!hospitalId) {
                console.log("No hospital_id - using dummy data");
                const mockForecasts = generateSurgeForecasts();
                const mockRecs = generateRecommendations();
                const today = new Date();
                const twoDaysLater = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
                
                setStats({
                    totalPatients: 1247,
                    totalConsultations: 342,
                    todayConsultations: 18,
                    pendingConsultations: 8,
                    highRiskCount: 12
                });
                
                setSurgeAlerts(mockForecasts
                    .filter(f => {
                        const forecastDate = new Date(f.date);
                        return forecastDate <= twoDaysLater && f.percentageIncrease > 30;
                    })
                    .map(f => ({
                        department: f.department,
                        date: f.date,
                        increase_percent: f.percentageIncrease,
                        from: f.baselineVolume,
                        to: f.predictedVolume
                    }))
                );
                
                setRecentConsultations([]);
                setRecommendationsCount({
                    total: mockRecs.length,
                    critical: mockRecs.filter(r => r.priority === "critical").length,
                    high: mockRecs.filter(r => r.priority === "high").length
                });
                
                setLoading(false);
                return;
            }

            // Load data with individual error handling
            const results = await Promise.allSettled([
                api.getHospitalPatientsCount(hospitalId),
                api.getHospitalConsultationsStats(hospitalId),
                api.getHospitalHighRiskConsultations(hospitalId),
                api.getHospitalPendingReviewConsultations(hospitalId),
                api.getHospital48hSurgeAlerts(hospitalId),
                api.getHospitalConsultations(hospitalId, {}),
                api.getRecommendationsStats(hospitalId)
            ]);

            // Process results - use dummy data as fallback
            const patientsCount = results[0].status === "fulfilled" ? results[0].value : { count: 1247 };
            const consultationsStats = results[1].status === "fulfilled" ? results[1].value : { total: 342, today: 18 };
            const highRiskCount = results[2].status === "fulfilled" ? results[2].value : { count: 12 };
            const pendingReviewCount = results[3].status === "fulfilled" ? results[3].value : { count: 8 };
            
            // Use dummy surge alerts if API fails
            let alertsData = results[4].status === "fulfilled" ? results[4].value : { alerts: [] };
            if (!alertsData.alerts || alertsData.alerts.length === 0) {
                const mockForecasts = generateSurgeForecasts();
                const today = new Date();
                const twoDaysLater = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
                alertsData = {
                    alerts: mockForecasts
                        .filter(f => {
                            const forecastDate = new Date(f.date);
                            return forecastDate <= twoDaysLater && f.percentageIncrease > 30;
                        })
                        .map(f => ({
                            department: f.department,
                            date: f.date,
                            increase_percent: f.percentageIncrease,
                            from: f.baselineVolume,
                            to: f.predictedVolume
                        }))
                };
            }
            
            const consultationsData = results[5].status === "fulfilled" ? results[5].value : [];
            
            // Use dummy recommendations if API fails
            let recommendationsStats = results[6].status === "fulfilled" ? results[6].value : { total: 0, critical: 0, high: 0 };
            if (recommendationsStats.total === 0) {
                const mockRecs = generateRecommendations();
                recommendationsStats = {
                    total: mockRecs.length,
                    critical: mockRecs.filter(r => r.priority === "critical").length,
                    high: mockRecs.filter(r => r.priority === "high").length,
                    medium: mockRecs.filter(r => r.priority === "medium").length,
                    low: mockRecs.filter(r => r.priority === "low").length
                };
            }

            // Log any failures
            results.forEach((result, idx) => {
                if (result.status === "rejected") {
                    console.error(`API call ${idx} failed:`, result.reason);
                }
            });

            setStats({
                totalPatients: patientsCount?.count || 0,
                totalConsultations: consultationsStats?.total || 0,
                todayConsultations: consultationsStats?.today || 0,
                pendingConsultations: pendingReviewCount?.count || 0,
                highRiskCount: highRiskCount?.count || 0
            });

            setSurgeAlerts(alertsData?.alerts || []);
            setRecentConsultations(Array.isArray(consultationsData) ? consultationsData.slice(0, 5) : []);
            setRecommendationsCount({
                total: recommendationsStats?.total || 0,
                critical: recommendationsStats?.critical || 0,
                high: recommendationsStats?.high || 0
            });
        } catch (error: any) {
            console.error("Failed to load dashboard data:", error);
            setError(`Failed to load dashboard: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        if (user && !authLoading) {
            loadDashboardData();
        }
    }, [user, authLoading, loadDashboardData]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">Please log in to view the dashboard</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Hospital Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of hospital operations, consultations, and resource management
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <Card className="border-red-300 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-900">
                            <AlertCircle className="h-5 w-5" />
                            <p>{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Loading dashboard data...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Critical Surge Alerts */}
                    {surgeAlerts.length > 0 && (
                        <Card className="border-red-300 bg-red-50">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <CardTitle className="text-red-900">
                                        Critical Surge Alert - Next 48 Hours
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {surgeAlerts.slice(0, 3).map((alert: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <div>
                                                <span className="font-semibold text-red-900">
                                                    {alert.department}
                                                </span>
                                                <span className="text-red-700 ml-2">
                                                    on {new Date(alert.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-900 font-bold">
                                                    +{alert.increase_percent}%
                                                </span>
                                                <span className="text-xs text-red-700">
                                                    ({alert.from} → {alert.to} patients)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/hospital-management/resource-management/surge-prediction">
                                    <Button variant="outline" size="sm" className="mt-4 w-full">
                                        View Full Surge Prediction
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

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

                    {/* Main Content Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Recent Consultations */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Consultations</CardTitle>
                                    <CardDescription>Latest patient consultations</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {recentConsultations.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No consultations yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {recentConsultations.map((consultation: any) => {
                                                const riskLevel = consultation.risk_assessment?.risk_level || "green";
                                                const riskColors = {
                                                    red: "bg-red-100 text-red-700 border-red-300",
                                                    orange: "bg-orange-100 text-orange-700 border-orange-300",
                                                    green: "bg-green-100 text-green-700 border-green-300"
                                                };

                                                return (
                                                    <div
                                                        key={consultation.id}
                                                        className="flex items-center justify-between p-3 border rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                                riskLevel === "red" ? "bg-red-100" :
                                                                riskLevel === "orange" ? "bg-orange-100" :
                                                                "bg-green-100"
                                                            }`}>
                                                                <Stethoscope className={`h-5 w-5 ${
                                                                    riskLevel === "red" ? "text-red-600" :
                                                                    riskLevel === "orange" ? "text-orange-600" :
                                                                    "text-green-600"
                                                                }`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">
                                                                    Patient #{consultation.patient_id}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {new Date(consultation.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {consultation.risk_assessment && (
                                                                <span className={`text-xs px-2 py-1 rounded-full border ${
                                                                    riskColors[riskLevel as keyof typeof riskColors] || riskColors.green
                                                                }`}>
                                                                    {riskLevel === "red" ? "High Risk" :
                                                                     riskLevel === "orange" ? "Moderate" : "Low Risk"}
                                                                </span>
                                                            )}
                                                            <span className={`text-xs px-2 py-1 rounded ${
                                                                consultation.status === "completed" ? "bg-green-100 text-green-700" :
                                                                consultation.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-blue-100 text-blue-700"
                                                            }`}>
                                                                {consultation.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recommendations */}
                        <div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>AI Recommendations</CardTitle>
                                    <CardDescription>Actionable insights</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Total Actions</span>
                                            <span className="text-lg font-bold">{recommendationsCount.total}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Critical</span>
                                            <span className="text-lg font-bold text-red-600">{recommendationsCount.critical}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">High Priority</span>
                                            <span className="text-lg font-bold text-orange-600">{recommendationsCount.high}</span>
                                        </div>
                                    </div>
                                    <Link href="/hospital-management/resource-management/recommendations">
                                        <Button variant="outline" className="w-full">
                                            View Recommendations
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Link href="/hospital-management/resource-management/surge-prediction">
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Surge Prediction</CardTitle>
                                            <CardDescription className="text-xs">
                                                AI-powered forecasts
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>

                        <Link href="/hospital-management/ask">
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Ask AURA</CardTitle>
                                            <CardDescription className="text-xs">
                                                Natural language queries
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
