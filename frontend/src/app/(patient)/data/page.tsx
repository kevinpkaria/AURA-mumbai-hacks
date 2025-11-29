"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Droplet, Thermometer, Weight, Ruler, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DataPage() {
    const { user } = useAuth();
    const [metrics, setMetrics] = React.useState<any[]>([]);
    const [latestMetrics, setLatestMetrics] = React.useState<any[]>([]);
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [documents, setDocuments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            const docs = await api.getPatientDocuments(user!.id);
            setDocuments(docs);

            const allMetrics: any[] = [];
            docs.forEach((doc: any) => {
                if (doc.metrics && Array.isArray(doc.metrics)) {
                    const docMetrics = doc.metrics.map((m: any) => ({
                        ...m,
                        date: doc.date_of_report || doc.created_at,
                        source: doc.name,
                        timestamp: new Date(doc.date_of_report || doc.created_at).getTime()
                    }));
                    allMetrics.push(...docMetrics);
                }
            });

            // Sort all metrics by date (newest first)
            allMetrics.sort((a, b) => b.timestamp - a.timestamp);
            setMetrics(allMetrics);

            // Get latest value for each unique metric name
            const latestByName: { [key: string]: any } = {};
            allMetrics.forEach(metric => {
                const name = metric.name?.toLowerCase() || '';
                if (!latestByName[name] || metric.timestamp > latestByName[name].timestamp) {
                    latestByName[name] = metric;
                }
            });
            setLatestMetrics(Object.values(latestByName));

            // Process data for charts - metrics that appear multiple times
            const metricsByName: { [key: string]: any[] } = {};
            allMetrics.forEach(metric => {
                const name = metric.name?.toLowerCase() || '';
                if (!metricsByName[name]) {
                    metricsByName[name] = [];
                }
                metricsByName[name].push(metric);
            });

            // Create chart data for metrics with more than one data point
            const charts: any[] = [];
            Object.entries(metricsByName).forEach(([name, dataPoints]) => {
                if (dataPoints.length > 1) {
                    // Sort by date ascending for charts
                    const sorted = dataPoints.sort((a, b) => a.timestamp - b.timestamp);
                    const chartPoints = sorted.map(dp => ({
                        date: new Date(dp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value: parseFloat(dp.value) || 0,
                        unit: dp.unit,
                        fullDate: dp.date
                    }));
                    charts.push({
                        name: dataPoints[0].name,
                        unit: dataPoints[0].unit,
                        data: chartPoints,
                        latest: dataPoints[dataPoints.length - 1].value,
                        previous: dataPoints[dataPoints.length - 2]?.value
                    });
                }
            });

            setChartData(charts);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIconForMetric = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("heart") || lower.includes("bp") || lower.includes("pressure")) return Heart;
        if (lower.includes("blood") || lower.includes("sugar") || lower.includes("glucose")) return Droplet;
        if (lower.includes("temp") || lower.includes("fever")) return Thermometer;
        if (lower.includes("weight")) return Weight;
        if (lower.includes("height")) return Ruler;
        return Activity;
    };

    const getColorForMetric = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("heart") || lower.includes("bp") || lower.includes("pressure")) return "text-red-500 bg-red-50";
        if (lower.includes("blood") || lower.includes("sugar") || lower.includes("glucose")) return "text-blue-500 bg-blue-50";
        if (lower.includes("temp") || lower.includes("fever")) return "text-orange-500 bg-orange-50";
        if (lower.includes("weight")) return "text-purple-500 bg-purple-50";
        if (lower.includes("height")) return "text-green-500 bg-green-50";
        return "text-sky-500 bg-sky-50";
    };

    const getTrend = (chart: any) => {
        if (!chart.previous) return null;
        const current = parseFloat(chart.latest);
        const prev = parseFloat(chart.previous);
        const change = ((current - prev) / prev) * 100;
        return {
            direction: change > 0 ? 'up' : 'down',
            percentage: Math.abs(change).toFixed(1)
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading health data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
                <p className="text-muted-foreground">Track your health metrics and trends over time</p>
            </div>

            {metrics.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Health Data Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                            Upload medical documents on your Dashboard to automatically extract and visualize your health metrics here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Quick Stats - Latest Metrics */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Latest Readings
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {latestMetrics.slice(0, 8).map((metric, i) => {
                                const Icon = getIconForMetric(metric.name || "");
                                const colorClass = getColorForMetric(metric.name || "");
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="overflow-hidden">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                                    {metric.name}
                                                </CardTitle>
                                                <div className={`p-2 rounded-lg ${colorClass}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {metric.value}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {metric.unit}
                                                </p>
                                                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(metric.date).toLocaleDateString()}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trends Over Time */}
                    {chartData.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Health Trends
                            </h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {chartData.map((chart, idx) => {
                                    const trend = getTrend(chart);
                                    return (
                                        <Card key={idx}>
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-base">{chart.name}</CardTitle>
                                                        <CardDescription className="mt-1">
                                                            {chart.data.length} readings tracked
                                                        </CardDescription>
                                                    </div>
                                                    {trend && (
                                                        <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md ${trend.direction === 'up'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-red-50 text-red-700'
                                                            }`}>
                                                            {trend.direction === 'up' ? (
                                                                <TrendingUp className="h-3 w-3" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3" />
                                                            )}
                                                            {trend.percentage}%
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <AreaChart data={chart.data}>
                                                        <defs>
                                                            <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                        <XAxis
                                                            dataKey="date"
                                                            tick={{ fontSize: 12 }}
                                                            stroke="#6b7280"
                                                        />
                                                        <YAxis
                                                            tick={{ fontSize: 12 }}
                                                            stroke="#6b7280"
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                borderRadius: '8px',
                                                                border: '1px solid #e5e7eb',
                                                                fontSize: '12px'
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="value"
                                                            stroke="#0ea5e9"
                                                            strokeWidth={2}
                                                            fill={`url(#gradient-${idx})`}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                                <div className="mt-3 flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Current: </span>
                                                    <span className="font-semibold">{chart.latest} {chart.unit}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity Timeline */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Recent Activity
                        </h2>
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {documents.slice(0, 5).map((doc, idx) => (
                                        <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                            <div className="rounded-full bg-primary/10 p-2 mt-1">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{doc.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {doc.metrics?.length || 0} metrics extracted
                                                </p>
                                            </div>
                                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                    {documents.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No documents uploaded yet
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* All Metrics - Organized by Report */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            All Metrics
                        </h2>
                        <div className="space-y-4">
                            {documents.map((doc, idx) => (
                                <Card key={idx}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{doc.name}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {doc.metrics && doc.metrics.length > 0 ? (
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                {doc.metrics.map((metric: any, metricIdx: number) => {
                                                    const Icon = getIconForMetric(metric.name || "");
                                                    const colorClass = getColorForMetric(metric.name || "");
                                                    return (
                                                        <div
                                                            key={metricIdx}
                                                            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                                                        >
                                                            <div className={`p-2 rounded-md ${colorClass}`}>
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {metric.name}
                                                                </p>
                                                                <p className="text-sm font-semibold">
                                                                    {metric.value} <span className="text-xs text-muted-foreground font-normal">{metric.unit}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No metrics extracted from this report
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                            {documents.length === 0 && (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No reports uploaded yet
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
