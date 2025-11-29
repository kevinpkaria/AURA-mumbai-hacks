"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Users,
    Package,
    Settings,
    MessageSquare,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface Recommendation {
    id: string;
    title: string;
    description: string;
    priority: "critical" | "high" | "medium" | "low";
    category: "staffing" | "supplies" | "operations" | "communication";
    department?: string;
    implementBy: string;
    estimatedCost?: number;
    actions: Array<{
        id: string;
        description: string;
        type: string;
        completed: boolean;
        quantity?: number;
        assignTo?: string;
        deadline?: string;
    }>;
}

export default function RecommendationsPage() {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [filterPriority, setFilterPriority] = React.useState<string>("all");
    const [filterCategory, setFilterCategory] = React.useState<string>("all");
    const [expandedRecs, setExpandedRecs] = React.useState<Set<string>>(new Set());
    const [stats, setStats] = React.useState({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        completed: 0
    });

    React.useEffect(() => {
        if (user) {
            loadRecommendations();
        }
    }, [user, filterPriority, filterCategory]);

    const loadRecommendations = async () => {
        if (!user) return;

        try {
            setLoading(true);
            
            // For admin users without hospital_id, try to get their hospital
            let hospitalId = user.hospital_id;
            
            if (!hospitalId && user.role === "admin") {
                try {
                    const hospitals = await api.getHospitals();
                    if (hospitals && hospitals.length > 0) {
                        hospitalId = hospitals[0].id;
                        console.log(`Using hospital ${hospitalId} for admin user`);
                    } else {
                        console.error("No hospitals found for admin user");
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to fetch hospitals:", e);
                    setLoading(false);
                    return;
                }
            }
            
            if (!hospitalId) {
                console.error("No hospital_id available");
                setLoading(false);
                return;
            }

            const [statsData, recsData] = await Promise.all([
                api.getRecommendationsStats(hospitalId),
                api.getHospitalRecommendations(hospitalId, {
                    priority: filterPriority !== "all" ? filterPriority : undefined,
                    category: filterCategory !== "all" ? filterCategory : undefined
                })
            ]);

            setStats({
                total: statsData.total || 0,
                critical: statsData.critical || 0,
                high: statsData.high || 0,
                medium: statsData.medium || 0,
                low: statsData.low || 0,
                completed: statsData.completed || 0
            });

            // Transform backend data to frontend format
            const transformedRecs: Recommendation[] = recsData.map((rec: any) => ({
                id: rec.id.toString(),
                title: rec.title,
                description: rec.description,
                priority: rec.priority,
                category: rec.category,
                department: rec.department,
                implementBy: rec.deadline || new Date().toISOString(),
                estimatedCost: rec.estimated_cost,
                actions: rec.extra_data?.actions || [
                    {
                        id: "1",
                        description: "Implement recommendation",
                        type: rec.category,
                        completed: rec.progress_completed >= rec.progress_total
                    }
                ]
            }));

            setRecommendations(transformedRecs);
        } catch (error) {
            console.error("Failed to load recommendations:", error);
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedRecs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRecs(newExpanded);
    };

    const toggleActionCompleted = async (recId: string, actionId: string) => {
        const rec = recommendations.find(r => r.id === recId);
        if (!rec) return;

        const action = rec.actions.find(a => a.id === actionId);
        if (!action) return;

        // Update locally first
        setRecommendations(prev => prev.map(r => {
            if (r.id === recId) {
                const updatedActions = r.actions.map(a =>
                    a.id === actionId ? { ...a, completed: !a.completed } : a
                );
                const completedCount = updatedActions.filter(a => a.completed).length;
                
                return {
                    ...r,
                    actions: updatedActions
                };
            }
            return r;
        }));

        // Update backend
        try {
            const recNum = parseInt(recId);
            const recData = recommendations.find(r => r.id === recId);
            if (recData) {
                const completedCount = recData.actions.filter(a => a.completed || a.id === actionId).length;
                await api.updateRecommendation(recNum, {
                    progress_completed: completedCount,
                    progress_total: recData.actions.length
                });
            }
        } catch (error) {
            console.error("Failed to update recommendation:", error);
            // Revert on error
            loadRecommendations();
        }
    };

    const filteredRecommendations = React.useMemo(() => {
        return recommendations.filter(rec => {
            if (filterPriority !== "all" && rec.priority !== filterPriority) return false;
            if (filterCategory !== "all" && rec.category !== filterCategory) return false;
            return true;
        });
    }, [recommendations, filterPriority, filterCategory]);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "staffing": return <Users className="h-4 w-4" />;
            case "supplies": return <Package className="h-4 w-4" />;
            case "operations": return <Settings className="h-4 w-4" />;
            case "communication": return <MessageSquare className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "critical": return {
                bg: "bg-red-50",
                border: "border-red-300",
                text: "text-red-900",
                badge: "bg-red-600"
            };
            case "high": return {
                bg: "bg-orange-50",
                border: "border-orange-300",
                text: "text-orange-900",
                badge: "bg-orange-600"
            };
            case "medium": return {
                bg: "bg-yellow-50",
                border: "border-yellow-300",
                text: "text-yellow-900",
                badge: "bg-yellow-600"
            };
            default: return {
                bg: "bg-blue-50",
                border: "border-blue-300",
                text: "text-blue-900",
                badge: "bg-blue-600"
            };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading recommendations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Recommendations</h1>
                <p className="text-muted-foreground">
                    Actionable insights and resource allocation suggestions
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div>
                    <label className="text-sm font-medium mr-2">Priority:</label>
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-md bg-background"
                    >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mr-2">Category:</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-md bg-background"
                    >
                        <option value="all">All Categories</option>
                        <option value="staffing">Staffing</option>
                        <option value="supplies">Supplies</option>
                        <option value="operations">Operations</option>
                        <option value="communication">Communication</option>
                    </select>
                </div>
                {(filterPriority !== "all" || filterCategory !== "all") && (
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredRecommendations.length} of {recommendations.length} recommendations
                    </p>
                )}
            </div>

            {/* Recommendations List */}
            <div className="space-y-4">
                {filteredRecommendations.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">No recommendations match the selected filters</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredRecommendations.map(rec => {
                        const colors = getPriorityColor(rec.priority);
                        const isExpanded = expandedRecs.has(rec.id);
                        const completedActions = rec.actions.filter(a => a.completed).length;
                        const progress = (completedActions / rec.actions.length) * 100;

                        return (
                            <Card
                                key={rec.id}
                                className={cn("border-l-4", colors.border, colors.bg)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-xs font-bold text-white uppercase",
                                                    colors.badge
                                                )}>
                                                    {rec.priority}
                                                </span>
                                                <span className="px-2 py-1 rounded text-xs bg-white border capitalize flex items-center gap-1">
                                                    {getCategoryIcon(rec.category)}
                                                    {rec.category}
                                                </span>
                                                {rec.department && (
                                                    <span className="text-xs text-muted-foreground">
                                                        • {rec.department}
                                                    </span>
                                                )}
                                            </div>
                                            <CardTitle className={cn("text-lg", colors.text)}>
                                                {rec.title}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                {rec.description}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleExpanded(rec.id)}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Implement by: {new Date(rec.implementBy).toLocaleDateString()}
                                        </div>
                                        {rec.estimatedCost && (
                                            <div>
                                                Est. Cost: ₹{rec.estimatedCost.toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">
                                                Progress: {completedActions}/{rec.actions.length} actions
                                            </span>
                                            <span className="font-medium">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all", colors.badge)}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Actions (Expanded) */}
                                {isExpanded && (
                                    <CardContent className="pt-0">
                                        <div className="border-t pt-3">
                                            <h4 className="font-semibold text-sm mb-3">Action Items:</h4>
                                            <div className="space-y-2">
                                                {rec.actions.map(action => (
                                                    <div
                                                        key={action.id}
                                                        className={cn(
                                                            "flex items-start gap-3 p-3 rounded border",
                                                            action.completed ? "bg-green-50 border-green-200" : "bg-white"
                                                        )}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={action.completed}
                                                            onChange={() => toggleActionCompleted(rec.id, action.id)}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <div className="flex-1">
                                                            <p className={cn(
                                                                "text-sm font-medium",
                                                                action.completed && "line-through text-muted-foreground"
                                                            )}>
                                                                {action.description}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                                <span className="capitalize">{action.type}</span>
                                                                {action.quantity && (
                                                                    <span>Qty: {action.quantity}</span>
                                                                )}
                                                                {action.assignTo && (
                                                                    <span>Assigned to: {action.assignTo}</span>
                                                                )}
                                                                <span>
                                                                    Deadline: {new Date(action.deadline).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
