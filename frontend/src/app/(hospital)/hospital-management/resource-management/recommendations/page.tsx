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
import { generateRecommendations, type Recommendation } from "@/lib/mockData";

export default function RecommendationsPage() {
    const [recommendations, setRecommendations] = React.useState(generateRecommendations());
    const [filterPriority, setFilterPriority] = React.useState<string>("all");
    const [filterCategory, setFilterCategory] = React.useState<string>("all");
    const [expandedRecs, setExpandedRecs] = React.useState<Set<string>>(new Set());

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedRecs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRecs(newExpanded);
    };

    const toggleActionCompleted = (recId: string, actionId: string) => {
        setRecommendations(prev => prev.map(rec => {
            if (rec.id === recId) {
                return {
                    ...rec,
                    actions: rec.actions.map(action =>
                        action.id === actionId ? { ...action, completed: !action.completed } : action
                    )
                };
            }
            return rec;
        }));
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

    const stats = React.useMemo(() => {
        const total = recommendations.length;
        const byPriority = {
            critical: recommendations.filter(r => r.priority === "critical").length,
            high: recommendations.filter(r => r.priority === "high").length,
            medium: recommendations.filter(r => r.priority === "medium").length,
            low: recommendations.filter(r => r.priority === "low").length
        };
        const completed = recommendations.filter(r =>
            r.actions.every(a => a.completed)
        ).length;
        return { total, byPriority, completed };
    }, [recommendations]);

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
                        <div className="text-2xl font-bold text-red-600">{stats.byPriority.critical}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.byPriority.high}</div>
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
                        Showing {filteredRecommendations.length} of {stats.total} recommendations
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
