"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    TrendingUp,
    Calendar,
    Activity,
    AlertTriangle,
    Cloud,
    Users,
    Bed,
    Heart,
    Wind,
    ThermometerSun,
    ArrowUp,
    ArrowDown,
    Minus,
    Loader2
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
    generateSurgeForecasts,
    generateFestivals,
    generatePollutionData,
    generateResourceUtilization,
    generateHealthAlerts,
    type SurgeForecast,
    type FestivalEvent,
    type PollutionData,
    type ResourceUtilization
} from "@/lib/mockData";

interface SurgeForecast {
    date: string;
    department: string;
    predictedVolume: number;
    baselineVolume: number;
    percentageIncrease: number;
    confidence: number;
    contributingFactors: Array<{
        type: string;
        name: string;
        impact: number;
        severity: string;
    }>;
}

interface FestivalEvent {
    id: string;
    name: string;
    date: string;
    type: string;
    expectedImpact: string;
    historicalOPDIncrease: number;
}

interface PollutionData {
    date: string;
    aqi: number;
    category: string;
    pm25: number;
    pm10: number;
    primaryPollutant: string;
}

export default function SurgePredictionPage() {
    const { user } = useAuth();
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>("all");
    const [timeRange, setTimeRange] = React.useState<"3day" | "7day">("7day");
    const [forecasts, setForecasts] = React.useState<SurgeForecast[]>([]);
    const [festivals, setFestivals] = React.useState<FestivalEvent[]>([]);
    const [pollution, setPollution] = React.useState<PollutionData[]>([]);
    const [criticalAlerts, setCriticalAlerts] = React.useState<any[]>([]);
    const [departmentForecasts, setDepartmentForecasts] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            loadSurgeData();
        }
    }, [user, timeRange, selectedDepartment]);

    const loadSurgeData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            
            // Use dummy data from mockData.ts
            const mockForecasts = generateSurgeForecasts();
            const mockFestivals = generateFestivals();
            const mockPollution = generatePollutionData();
            const mockResourceUtil = generateResourceUtilization();
            const mockHealthAlerts = generateHealthAlerts();

            // Filter forecasts by time range
            const days = timeRange === "3day" ? 3 : 7;
            const today = new Date();
            const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
            
            const filteredForecasts = mockForecasts.filter(f => {
                const forecastDate = new Date(f.date);
                return forecastDate >= today && forecastDate <= endDate;
            });

            setForecasts(filteredForecasts);

            // Generate critical alerts (next 48 hours with >30% increase)
            const twoDaysLater = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
            const critical = filteredForecasts
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
                }));
            setCriticalAlerts(critical);

            // Generate department forecasts (aggregate by department)
            const deptMap = new Map<string, any>();
            filteredForecasts.forEach(f => {
                const existing = deptMap.get(f.department) || {
                    department: f.department,
                    baseline: 0,
                    predicted: 0,
                    dates: []
                };
                existing.baseline += f.baselineVolume;
                existing.predicted += f.predictedVolume;
                existing.dates.push(f.date);
                deptMap.set(f.department, existing);
            });

            const deptForecasts = Array.from(deptMap.values()).map(dept => ({
                department: dept.department,
                baseline: Math.round(dept.baseline / dept.dates.length),
                predicted: Math.round(dept.predicted / dept.dates.length),
                increase_percent: Math.round(((dept.predicted - dept.baseline) / dept.baseline) * 100),
                confidence: 0.75,
                date: dept.dates[0] // Use first date
            }));
            setDepartmentForecasts(deptForecasts);

            // Set festivals
            setFestivals(mockFestivals);

            // Set pollution data
            setPollution(mockPollution);

        } catch (error) {
            console.error("Failed to load surge data:", error);
            // Fallback to empty data
            setForecasts([]);
            setFestivals([]);
            setPollution([]);
            setCriticalAlerts([]);
            setDepartmentForecasts([]);
        } finally {
            setLoading(false);
        }
    };

    // Get unique departments
    const departments = Array.from(new Set(forecasts.map(f => f.department)));

    // Filter forecasts by selected department and time range
    const filteredForecasts = React.useMemo(() => {
        let filtered = selectedDepartment === "all"
            ? forecasts
            : forecasts.filter(f => f.department === selectedDepartment);

        if (timeRange === "3day") {
            const today = new Date();
            const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(f => new Date(f.date) <= threeDaysLater);
        }

        return filtered;
    }, [forecasts, selectedDepartment, timeRange]);

    // Use critical alerts from API
    const criticalSurges = criticalAlerts;

    // Prepare chart data from forecast API response
    const chartData = React.useMemo(() => {
        // Use the forecast data directly from API
        if (forecasts.length > 0) {
            const dateMap = new Map<string, { date: string; baseline: number; predicted: number }>();
            
            forecasts.forEach(f => {
                if (selectedDepartment === "all" || f.department === selectedDepartment) {
                    const existing = dateMap.get(f.date) || { date: f.date, baseline: 0, predicted: 0 };
                    dateMap.set(f.date, {
                        date: f.date,
                        baseline: existing.baseline + f.baselineVolume,
                        predicted: existing.predicted + f.predictedVolume
                    });
                }
            });

            return Array.from(dateMap.values())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(d => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }));
        }
        return [];
    }, [forecasts, selectedDepartment]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading surge predictions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Surge Prediction Dashboard</h1>
                <p className="text-muted-foreground">
                    AI-powered {timeRange === "3day" ? "3-day" : "7-day"} forecasts with external and internal signals
                </p>
            </div>

            {/* Critical Alerts Banner */}
            {criticalAlerts.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <CardTitle className="text-red-900">
                                Critical Surge Alert - Next 48 Hours
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {criticalAlerts.slice(0, 3).map((alert: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div>
                                        <span className="font-semibold text-red-900">{alert.department}</span>
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
                    </CardContent>
                </Card>
            )}

            {/* Real-Time Hospital Signals */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Real-Time Hospital Signals</h2>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Resource Utilization</CardTitle>
                        <CardDescription>Current hospital resource status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {(() => {
                                const todayUtil = generateResourceUtilization()[7]; // Today's data
                                return (
                                    <>
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">Bed Occupancy</span>
                                                <Bed className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-2xl font-bold">{todayUtil.bedOccupancy.toFixed(0)}%</div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full" 
                                                    style={{ width: `${todayUtil.bedOccupancy}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">ICU Occupancy</span>
                                                <Heart className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-2xl font-bold">{todayUtil.icuOccupancy.toFixed(0)}%</div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                <div 
                                                    className="bg-red-600 h-2 rounded-full" 
                                                    style={{ width: `${todayUtil.icuOccupancy}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">Ventilators</span>
                                                <Wind className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-2xl font-bold">
                                                {todayUtil.ventilators.inUse}/{todayUtil.ventilators.total}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">In use</p>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted-foreground">Nurses</span>
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-2xl font-bold">
                                                {todayUtil.nurses.present}/{todayUtil.nurses.scheduled}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Present</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div>
                    <label className="text-sm font-medium mr-2">Department:</label>
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-md bg-background"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mr-2">Forecast Range:</label>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                        className="px-3 py-2 text-sm border rounded-md bg-background"
                    >
                        <option value="3day">Next 3 Days</option>
                        <option value="7day">Next 7 Days</option>
                    </select>
                </div>
            </div>

            {/* 7-Day Forecast Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Patient Volume Forecast
                    </CardTitle>
                    <CardDescription>
                        Predicted vs baseline volume for {selectedDepartment === "all" ? "all departments" : selectedDepartment}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="baseline"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    name="Baseline"
                                    strokeDasharray="5 5"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    name="Predicted"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Department Forecast Cards */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Department-Wise Surge Forecast</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {departmentForecasts.map((dept: any) => {
                        const nextSurge = dept;
                        if (!nextSurge) return null;

                        const isIncrease = nextSurge.increase_percent > 0;
                        const severity = Math.abs(nextSurge.increase_percent) > 40 ? "high" :
                            Math.abs(nextSurge.increase_percent) > 25 ? "medium" : "low";

                        return (
                            <Card key={nextSurge.department} className={cn(
                                "border-2",
                                severity === "high" ? "border-red-300 bg-red-50" :
                                    severity === "medium" ? "border-orange-300 bg-orange-50" :
                                        "border-blue-300 bg-blue-50"
                            )}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>{nextSurge.department}</span>
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center",
                                            severity === "high" ? "bg-red-600" :
                                                severity === "medium" ? "bg-orange-600" :
                                                    "bg-blue-600"
                                        )}>
                                            {isIncrease ? (
                                                <ArrowUp className="h-5 w-5 text-white" />
                                            ) : (
                                                <ArrowDown className="h-5 w-5 text-white" />
                                            )}
                                        </div>
                                    </CardTitle>
                                    <CardDescription>
                                        {new Date(nextSurge.date || new Date()).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={cn(
                                                "text-3xl font-bold",
                                                severity === "high" ? "text-red-900" :
                                                    severity === "medium" ? "text-orange-900" :
                                                        "text-blue-900"
                                            )}>
                                                {isIncrease ? "+" : ""}{nextSurge.increase_percent.toFixed(0)}%
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                ({nextSurge.baseline} → {nextSurge.predicted})
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Confidence: {(nextSurge.confidence * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* External Factors Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>External Triggers & Health Alerts</CardTitle>
                    <CardDescription>Factors influencing patient volume</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Festivals */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Upcoming Festivals
                            </h3>
                            <div className="grid gap-2 md:grid-cols-2">
                                {festivals.map(festival => (
                                    <div key={festival.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                            <p className="font-medium text-sm">{festival.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(festival.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-orange-600">
                                                +{festival.historicalOPDIncrease}%
                                            </p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {festival.expectedImpact} impact
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pollution Forecast */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Cloud className="h-4 w-4 text-primary" />
                                Air Quality Forecast (7-day)
                            </h3>
                            <div className="grid gap-2 grid-cols-7">
                                {pollution.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "p-2 rounded text-center border-2",
                                            day.category === "hazardous" ? "bg-purple-100 border-purple-400" :
                                                day.category === "very_unhealthy" ? "bg-red-100 border-red-400" :
                                                    day.category === "unhealthy" ? "bg-orange-100 border-orange-400" :
                                                        day.category === "moderate" ? "bg-yellow-100 border-yellow-400" :
                                                            "bg-green-100 border-green-400"
                                        )}
                                    >
                                        <p className="text-xs font-medium">
                                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </p>
                                        <p className="text-lg font-bold mt-1">{day.aqi}</p>
                                        <p className="text-xs capitalize mt-1">{day.category.replace('_', ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Health Alerts */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-primary" />
                                Active Health Alerts
                            </h3>
                            <div className="space-y-2">
                                {generateHealthAlerts().map(alert => (
                                    <div 
                                        key={alert.id} 
                                        className={cn(
                                            "p-3 border rounded-lg",
                                            alert.severity === "critical" ? "bg-red-50 border-red-200" :
                                            alert.severity === "warning" ? "bg-orange-50 border-orange-200" :
                                            "bg-yellow-50 border-yellow-200"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-sm capitalize">{alert.type} Alert</p>
                                                <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Affected: {alert.affectedAreas.join(", ")}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold">{alert.expectedCases} cases</p>
                                                <p className="text-xs text-muted-foreground capitalize">{alert.severity}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
