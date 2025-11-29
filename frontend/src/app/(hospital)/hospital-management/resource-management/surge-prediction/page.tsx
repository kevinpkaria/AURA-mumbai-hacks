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
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>("all");
    const [timeRange, setTimeRange] = React.useState<"3day" | "7day">("7day");
    const [forecasts, setForecasts] = React.useState<SurgeForecast[]>([]);
    const [festivals, setFestivals] = React.useState<FestivalEvent[]>([]);
    const [pollution, setPollution] = React.useState<PollutionData[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [city] = React.useState("Delhi");

    React.useEffect(() => {
        loadSurgeData();
    }, [city, timeRange]);

    const loadSurgeData = async () => {
        try {
            setLoading(true);
            const days = timeRange === "3day" ? 3 : 7;
            const forecastData = await api.getSurgeForecast(city, days);
            
            // Transform backend data to frontend format
            const transformedForecasts: SurgeForecast[] = [];
            const festivalsSet: Map<string, FestivalEvent> = new Map();
            const pollutionMap: Map<string, PollutionData> = new Map();

            forecastData.forEach((pred: any) => {
                const footfall = pred.footfall_forecast || {};
                const date = pred.date;

                // Extract festivals
                if (pred.festival_events) {
                    pred.festival_events.forEach((fest: any, idx: number) => {
                        const festId = `fest-${date}-${idx}`;
                        if (!festivalsSet.has(festId)) {
                            festivalsSet.set(festId, {
                                id: festId,
                                name: fest.name || "Festival",
                                date: date,
                                type: fest.type || "religious",
                                expectedImpact: fest.expectedImpact || "medium",
                                historicalOPDIncrease: fest.historicalOPDIncrease || 20
                            });
                        }
                    });
                }

                // Extract pollution data
                if (pred.aqi_data) {
                    const aqi = pred.aqi_data.aqi || 100;
                    let category = "moderate";
                    if (aqi < 50) category = "good";
                    else if (aqi < 100) category = "moderate";
                    else if (aqi < 200) category = "unhealthy";
                    else if (aqi < 300) category = "very_unhealthy";
                    else category = "hazardous";

                    pollutionMap.set(date, {
                        date: date,
                        aqi: aqi,
                        category: category,
                        pm25: pred.aqi_data.pm25 || aqi * 0.6,
                        pm10: pred.aqi_data.pm10 || aqi * 0.8,
                        primaryPollutant: aqi > 200 ? "PM2.5" : "PM10"
                    });
                }

                // Extract department forecasts
                Object.keys(footfall).forEach((dept: string) => {
                    const deptData = footfall[dept];
                    if (typeof deptData === 'object' && deptData !== null) {
                        const percentageIncrease = deptData.percentageIncrease || 0;
                        const baselineVolume = deptData.baselineVolume || 100;
                        const predictedVolume = deptData.predictedVolume || baselineVolume;
                        const confidence = deptData.confidence || 0.7;
                        const factors = deptData.contributingFactors || [];

                        transformedForecasts.push({
                            date: date,
                            department: dept,
                            predictedVolume: predictedVolume,
                            baselineVolume: baselineVolume,
                            percentageIncrease: percentageIncrease,
                            confidence: confidence,
                            contributingFactors: factors.map((f: any) => ({
                                type: f.type || "historical_trend",
                                name: f.name || "Factor",
                                impact: f.impact || 0,
                                severity: f.severity || "low"
                            }))
                        });
                    }
                });
            });

            setForecasts(transformedForecasts);
            setFestivals(Array.from(festivalsSet.values()));
            setPollution(Array.from(pollutionMap.values()).sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
            ));
        } catch (error) {
            console.error("Failed to load surge data:", error);
            // Fallback to empty arrays on error
            setForecasts([]);
            setFestivals([]);
            setPollution([]);
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

    // Get critical surges (> 40% increase in next 48 hours)
    const criticalSurges = React.useMemo(() => {
        const today = new Date();
        const twoDaysLater = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        return forecasts.filter(f =>
            new Date(f.date) <= twoDaysLater && f.percentageIncrease > 40
        );
    }, [forecasts]);

    // Prepare chart data
    const chartData = React.useMemo(() => {
        if (selectedDepartment === "all") {
            // Aggregate by date
            const dateMap = new Map<string, { date: string; baseline: number; predicted: number }>();

            forecasts.forEach(f => {
                const existing = dateMap.get(f.date) || { date: f.date, baseline: 0, predicted: 0 };
                dateMap.set(f.date, {
                    date: f.date,
                    baseline: existing.baseline + f.baselineVolume,
                    predicted: existing.predicted + f.predictedVolume
                });
            });

            return Array.from(dateMap.values()).map(d => ({
                ...d,
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }));
        } else {
            return filteredForecasts.map(f => ({
                date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                baseline: f.baselineVolume,
                predicted: f.predictedVolume
            }));
        }
    }, [forecasts, filteredForecasts, selectedDepartment]);

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
            {criticalSurges.length > 0 && (
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
                            {criticalSurges.slice(0, 3).map((surge, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div>
                                        <span className="font-semibold text-red-900">{surge.department}</span>
                                        <span className="text-red-700 ml-2">
                                            on {new Date(surge.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-900 font-bold">
                                            +{surge.percentageIncrease.toFixed(0)}%
                                        </span>
                                        <span className="text-xs text-red-700">
                                            ({surge.baselineVolume} → {surge.predictedVolume} patients)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Real-Time Signals - Note: Resource utilization would come from a separate endpoint */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Real-Time Hospital Signals</h2>
                            <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">Resource utilization data will be available when backend endpoint is implemented</p>
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
                    {departments.map(dept => {
                        // Get next significant surge for this department
                        const deptForecasts = forecasts.filter(f => f.department === dept);
                        const nextSurge = deptForecasts.find(f => Math.abs(f.percentageIncrease) > 15);

                        if (!nextSurge) return null;

                        const isIncrease = nextSurge.percentageIncrease > 0;
                        const severity = Math.abs(nextSurge.percentageIncrease) > 40 ? "high" :
                            Math.abs(nextSurge.percentageIncrease) > 25 ? "medium" : "low";

                        return (
                            <Card key={dept} className={cn(
                                "border-2",
                                severity === "high" ? "border-red-300 bg-red-50" :
                                    severity === "medium" ? "border-orange-300 bg-orange-50" :
                                        "border-blue-300 bg-blue-50"
                            )}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>{dept}</span>
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
                                        {new Date(nextSurge.date).toLocaleDateString('en-US', {
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
                                                {isIncrease ? "+" : ""}{nextSurge.percentageIncrease.toFixed(0)}%
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                ({nextSurge.baselineVolume} → {nextSurge.predictedVolume})
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Confidence: {(nextSurge.confidence * 100).toFixed(0)}%
                                        </p>
                                    </div>

                                    {nextSurge.contributingFactors.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-semibold mb-1">Contributing Factors:</p>
                                            <div className="space-y-1">
                                                {nextSurge.contributingFactors.slice(0, 2).map((factor, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 text-xs">
                                                        {factor.type === "festival" && <Calendar className="h-3 w-3" />}
                                                        {factor.type === "pollution" && <Cloud className="h-3 w-3" />}
                                                        {factor.type === "epidemic" && <Activity className="h-3 w-3" />}
                                                        <span className="truncate">{factor.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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

                        {/* Health Alerts - Note: Would be available when backend endpoint is implemented */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
