"use client";

import * as React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    CalendarRange,
    AlertTriangle,
    TrendingUp,
    Clock,
    Filter,
    ArrowUpRight,
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

type Department =
    | "Pulmonology"
    | "Hepatology"
    | "Gastroenterology"
    | "Cardiology"
    | "Neurology"
    | "Nephrology"
    | "Urology"
    | "Orthopedics"
    | "Hematology"
    | "Dermatology"
    | "Ophthalmology"
    | "ENT"
    | "Endocrinology"
    | "Gynecology"
    | "Obstetrics";

type Role = "Doctor" | "Nurse" | "Emergency Care Staff" | "Surgeon";

interface StaffRecord {
    date: string; // ISO date
    department: Department;
    role: Role;
    present: number;
    required: number;
    forecasted: number;
    scheduled?: number; // only for future dates
    isPast: boolean;
}

const DEPARTMENTS: Department[] = [
    "Pulmonology",
    "Hepatology",
    "Gastroenterology",
    "Cardiology",
    "Neurology",
    "Nephrology",
    "Urology",
    "Orthopedics",
    "Hematology",
    "Dermatology",
    "Ophthalmology",
    "ENT",
    "Endocrinology",
    "Gynecology",
    "Obstetrics",
];

const ROLES: Role[] = ["Doctor", "Nurse", "Emergency Care Staff", "Surgeon"];

function generateDummyStaffData(): StaffRecord[] {
    const records: StaffRecord[] = [];
    const today = new Date();

    // Helper to get date offset
    const addDays = (base: Date, days: number) => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Simple deterministic pseudo-random for consistent UI
    let seed = 42;
    const rand = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Past 30 days (-29 .. 0) and next 14 days (1 .. 14)
    for (let offset = -29; offset <= 14; offset++) {
        const currentDate = addDays(today, offset);
        const isPast = offset <= 0;

        DEPARTMENTS.forEach((department, deptIndex) => {
            ROLES.forEach((role, roleIndex) => {
                // Base demand by department/role
                const base =
                    4 +
                    (deptIndex % 5) +
                    (roleIndex === 0 ? 4 : roleIndex === 1 ? 6 : 3);

                const weekday = currentDate.getDay(); // 0 Sun - 6 Sat
                const weekendBoost = weekday === 0 || weekday === 6 ? 0.8 : 1;

                const required =
                    Math.round(
                        base *
                            weekendBoost *
                            (1 + (rand() - 0.5) * 0.2) // small noise
                    ) + (department === "Emergency Care Staff" ? 2 : 0);

                const forecasted = Math.max(
                    1,
                    Math.round(required * (1 + (rand() - 0.5) * 0.25))
                );

                let present = required;
                let scheduled: number | undefined = undefined;

                if (isPast) {
                    // Introduce some under-staffed and over-staffed days
                    const shortageChance = 0.18 + (deptIndex % 3) * 0.04;
                    const surplusChance = 0.12;
                    const r = rand();
                    if (r < shortageChance) {
                        present = Math.max(
                            0,
                            required - Math.round(1 + rand() * 3)
                        );
                    } else if (r < shortageChance + surplusChance) {
                        present = required + Math.round(1 + rand() * 2);
                    } else {
                        present =
                            required +
                            Math.round((rand() - 0.5) * 2); // near required
                    }
                } else {
                    // Future: scheduled vs forecasted
                    scheduled = Math.max(
                        0,
                        Math.round(forecasted * (0.9 + rand() * 0.25))
                    );
                    present = 0;
                }

                records.push({
                    date: currentDate.toISOString().slice(0, 10),
                    department,
                    role,
                    present,
                    required,
                    forecasted,
                    scheduled,
                    isPast,
                });
            });
        });
    }

    return records;
}

export default function StaffManagementPage() {
    const [selectedDepartment, setSelectedDepartment] =
        React.useState<Department | "all">("all");
    const [selectedRole, setSelectedRole] = React.useState<Role | "all">("all");
    const [focusRange, setFocusRange] =
        React.useState<"30d" | "14d" | "all">("30d");

    const allRecords = React.useMemo(() => generateDummyStaffData(), []);

    const filteredRecords = React.useMemo(() => {
        return allRecords.filter((r) => {
            const matchesDept =
                selectedDepartment === "all" ||
                r.department === selectedDepartment;
            const matchesRole =
                selectedRole === "all" || r.role === selectedRole;
            return matchesDept && matchesRole;
        });
    }, [allRecords, selectedDepartment, selectedRole]);

    // Aggregate per day for charts
    const dailyAggregates = React.useMemo(() => {
        const map = new Map<
            string,
            {
                date: string;
                label: string;
                isPast: boolean;
                present: number;
                required: number;
                forecasted: number;
                scheduled: number;
            }
        >();

        filteredRecords.forEach((r) => {
            const existing = map.get(r.date) || {
                date: r.date,
                label: new Date(r.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                isPast: r.isPast,
                present: 0,
                required: 0,
                forecasted: 0,
                scheduled: 0,
            };

            existing.isPast = r.isPast;
            existing.present += r.present;
            existing.required += r.required;
            existing.forecasted += r.forecasted;
            existing.scheduled += r.scheduled || 0;

            map.set(r.date, existing);
        });

        let list = Array.from(map.values()).sort(
            (a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        if (focusRange === "30d") {
            const today = new Date();
            const cutoff = new Date(
                today.getTime() - 29 * 24 * 60 * 60 * 1000
            );
            list = list.filter(
                (item) =>
                    new Date(item.date).getTime() >= cutoff.getTime() &&
                    new Date(item.date).getTime() <= today.getTime()
            );
        } else if (focusRange === "14d") {
            const today = new Date();
            const futureLimit = new Date(
                today.getTime() + 14 * 24 * 60 * 60 * 1000
            );
            list = list.filter(
                (item) =>
                    new Date(item.date).getTime() >= today.getTime() &&
                    new Date(item.date).getTime() <= futureLimit.getTime()
            );
        }

        return list;
    }, [filteredRecords, focusRange]);

    // Understaffed days (global across all departments/roles for the past 30 days),
    // with breakdown by department & role so users don't have to keep changing filters.
    const understaffedDays = React.useMemo(() => {
        const today = new Date();
        const cutoff = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

        type Issue = {
            department: Department;
            role: Role;
            present: number;
            required: number;
            forecasted: number;
            gap: number;
        };

        const byDate = new Map<
            string,
            {
                date: string;
                totalPresent: number;
                totalRequired: number;
                totalForecasted: number;
                issues: Issue[];
            }
        >();

        allRecords.forEach((r) => {
            const dDate = new Date(r.date);
            if (!r.isPast) return;
            if (dDate.getTime() < cutoff.getTime() || dDate.getTime() > today.getTime()) {
                return;
            }

            const gap = r.required - r.present;
            if (gap <= 0) return;

            const existing =
                byDate.get(r.date) || {
                    date: r.date,
                    totalPresent: 0,
                    totalRequired: 0,
                    totalForecasted: 0,
                    issues: [],
                };

            existing.totalPresent += r.present;
            existing.totalRequired += r.required;
            existing.totalForecasted += r.forecasted;
            existing.issues.push({
                department: r.department,
                role: r.role,
                present: r.present,
                required: r.required,
                forecasted: r.forecasted,
                gap,
            });

            byDate.set(r.date, existing);
        });

        const days = Array.from(byDate.values()).map((day) => {
            const totalGap = day.totalRequired - day.totalPresent;
            const severity =
                totalGap >= 60 ? "high" : totalGap >= 30 ? "medium" : "low";

            const sortedIssues = [...day.issues].sort(
                (a, b) => b.gap - a.gap
            );

            return {
                ...day,
                gap: totalGap,
                severity,
                issues: sortedIssues,
            };
        });

        return days
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 8);
    }, [allRecords]);

    // Summary metrics for last 30 days
    const summary = React.useMemo(() => {
        const past = dailyAggregates.filter((d) => d.isPast);
        if (past.length === 0) {
            return {
                avgPresent: 0,
                avgRequired: 0,
                avgForecasted: 0,
                understaffedCount: 0,
            };
        }

        const totalPresent = past.reduce((sum, d) => sum + d.present, 0);
        const totalRequired = past.reduce((sum, d) => sum + d.required, 0);
        const totalForecasted = past.reduce(
            (sum, d) => sum + d.forecasted,
            0
        );
        const understaffedCount = past.filter(
            (d) => d.present < d.required
        ).length;

        return {
            avgPresent: Math.round(totalPresent / past.length),
            avgRequired: Math.round(totalRequired / past.length),
            avgForecasted: Math.round(totalForecasted / past.length),
            understaffedCount,
        };
    }, [dailyAggregates]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Staff Management Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Central view of past attendance, AI-required staffing, and
                    future schedules across all departments.
                </p>
            </div>

            {/* Top summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg. Daily Present (last 30 days)
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.avgPresent}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across{" "}
                            {selectedDepartment === "all"
                                ? "all departments"
                                : selectedDepartment}
                            {selectedRole !== "all" && ` · ${selectedRole}s`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg. Optimal Required (last 30 days)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.avgRequired}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            AI-estimated optimal staffing per day
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Understaffed Days (last 30 days)
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {summary.understaffedCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Where present staff &lt; required
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Global filters */}
            <Card id="staff-filters">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-4 w-4 text-primary" />
                            Global Filters
                        </CardTitle>
                        <CardDescription>
                            Slice staffing history and forecasts by department
                            and role.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                            Viewing:{" "}
                            {focusRange === "30d"
                                ? "Past 30 days"
                                : focusRange === "14d"
                                ? "Next 14 days"
                                : "Full range"}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium block mb-1">
                            Department
                        </label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) =>
                                setSelectedDepartment(
                                    e.target.value as Department | "all"
                                )
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        >
                            <option value="all">All departments</option>
                            {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                    {dept}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium block mb-1">
                            Staff role
                        </label>
                        <select
                            value={selectedRole}
                            onChange={(e) =>
                                setSelectedRole(
                                    e.target.value as Role | "all"
                                )
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        >
                            <option value="all">All roles</option>
                            {ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium block mb-1">
                            Time focus
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant={
                                    focusRange === "30d"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => setFocusRange("30d")}
                            >
                                Past 30 days
                            </Button>
                            <Button
                                variant={
                                    focusRange === "14d"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => setFocusRange("14d")}
                            >
                                Next 14 days
                            </Button>
                            <Button
                                variant={
                                    focusRange === "all"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                className="flex-1"
                                onClick={() => setFocusRange("all")}
                            >
                                Full
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily staffing needs */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Daily staffing needs
                        </CardTitle>
                        <CardDescription>
                            Compare{" "}
                            <span className="font-medium">
                                present, forecasted, and optimal required
                            </span>{" "}
                            staff in the past, and{" "}
                            <span className="font-medium">
                                forecasted vs scheduled
                            </span>{" "}
                            in the future.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 self-start"
                        onClick={() =>
                            document
                                .getElementById("staff-filters")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                    >
                        <Filter className="h-4 w-4" />
                        Filter by department & role
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <StaffDailyChart
                                data={dailyAggregates}
                                focusRange={focusRange}
                            />
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Past days show{" "}
                        <span className="font-medium">Present</span>,{" "}
                        <span className="font-medium">Required</span>, and{" "}
                        <span className="font-medium">Forecasted</span>{" "}
                        headcount per day. Future days show{" "}
                        <span className="font-medium">Forecasted need</span> vs{" "}
                        <span className="font-medium">Scheduled staff</span>.
                    </p>
                </CardContent>
            </Card>

            {/* Understaffed focus + quick breakdown */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Understaffed action list */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Understaffed days to review
                        </CardTitle>
                        <CardDescription>
                            Highlighted days where staffing fell short of what AI
                            identified as required, with top departments and roles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {understaffedDays.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No understaffed days for the selected filters.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {understaffedDays.map((d) => {
                                    const topIssues = d.issues.slice(0, 4);
                                    const remaining = d.issues.length - topIssues.length;

                                    return (
                                        <div
                                            key={d.date}
                                            className="p-3 border rounded-lg space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {new Date(
                                                            d.date
                                                        ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                weekday: "short",
                                                                month: "short",
                                                                day: "numeric",
                                                            }
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Present vs required (actual)
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right text-xs">
                                                        <p className="font-semibold">
                                                            Total gap: {d.gap} staff
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            Present{" "}
                                                            <span className="font-semibold">
                                                                {d.totalPresent}
                                                            </span>{" "}
                                                            / Required{" "}
                                                            <span className="font-semibold">
                                                                {d.totalRequired}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={
                                                            "text-xs px-2 py-1 rounded-full border " +
                                                            (d.severity === "high"
                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                : d.severity === "medium"
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : "bg-yellow-50 text-yellow-700 border-yellow-200")
                                                        }
                                                    >
                                                        {d.severity === "high"
                                                            ? "High priority"
                                                            : d.severity === "medium"
                                                            ? "Medium priority"
                                                            : "Mild gap"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Per-department & role breakdown */}
                                            <div className="rounded-md bg-muted/40 border text-xs">
                                                <div className="grid grid-cols-12 px-3 py-2 font-medium text-muted-foreground">
                                                    <div className="col-span-5">
                                                        Department · Role
                                                    </div>
                                                    <div className="col-span-3 text-right">
                                                        Present / Required
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        Gap
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        Forecasted
                                                    </div>
                                                </div>
                                                <div className="divide-y">
                                                    {topIssues.map((issue, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="grid grid-cols-12 px-3 py-2 items-center"
                                                        >
                                                            <div className="col-span-5">
                                                                <p className="font-medium">
                                                                    {issue.department}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {issue.role}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-3 text-right">
                                                                <span className="font-semibold">
                                                                    {issue.present}
                                                                </span>{" "}
                                                                /{" "}
                                                                <span className="font-semibold">
                                                                    {issue.required}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-2 text-right">
                                                                <span className="font-semibold text-red-600">
                                                                    {issue.gap}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-2 text-right text-muted-foreground">
                                                                {issue.forecasted}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {remaining > 0 && (
                                                    <div className="px-3 py-1.5 border-t text-[11px] text-muted-foreground text-right">
                                                        +{remaining} more department/role
                                                        {remaining > 1 ? "s" : ""} with
                                                        smaller gaps
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Today & next week snapshot */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-primary" />
                            Today & next 7 days
                        </CardTitle>
                        <CardDescription>
                            Quick view of staffing sufficiency around today.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {(() => {
                            const todayISO = new Date()
                                .toISOString()
                                .slice(0, 10);
                            const today = dailyAggregates.find(
                                (d) => d.date === todayISO
                            );
                            const next7 = dailyAggregates.filter((d) => {
                                const t = new Date();
                                const dDate = new Date(d.date);
                                const diffDays = Math.round(
                                    (dDate.getTime() - t.getTime()) /
                                        (24 * 60 * 60 * 1000)
                                );
                                return diffDays > 0 && diffDays <= 7;
                            });

                            const upcomingGaps = next7.filter(
                                (d) => d.scheduled < d.forecasted
                            );

                            return (
                                <>
                                    <div>
                                        <p className="text-xs font-semibold mb-1">
                                            Today
                                        </p>
                                        {today ? (
                                            <p className="text-xs text-muted-foreground">
                                                Present{" "}
                                                <span className="font-semibold">
                                                    {today.present}
                                                </span>{" "}
                                                / Required{" "}
                                                <span className="font-semibold">
                                                    {today.required}
                                                </span>{" "}
                                                {today.present <
                                                today.required ? (
                                                    <span className="ml-1 text-red-600">
                                                        (Understaffed)
                                                    </span>
                                                ) : (
                                                    <span className="ml-1 text-green-600">
                                                        (Adequate)
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                No data for today in the
                                                selected filter.
                                            </p>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t">
                                        <p className="text-xs font-semibold mb-1">
                                            Next 7 days
                                        </p>
                                        {next7.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">
                                                No future projections available
                                                in this range.
                                            </p>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {upcomingGaps.length} days
                                                    with scheduled staff below
                                                    forecasted need.
                                                </p>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {upcomingGaps
                                                        .slice(0, 5)
                                                        .map((d) => (
                                                            <div
                                                                key={d.date}
                                                                className="flex items-center justify-between text-xs"
                                                            >
                                                                <span>
                                                                    {new Date(
                                                                        d.date
                                                                    ).toLocaleDateString(
                                                                        "en-US",
                                                                        {
                                                                            weekday:
                                                                                "short",
                                                                            month: "short",
                                                                            day: "numeric",
                                                                        }
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    Sched.{" "}
                                                                    <span className="font-semibold">
                                                                        {
                                                                            d.scheduled
                                                                        }
                                                                    </span>{" "}
                                                                    / Need{" "}
                                                                    <span className="font-semibold">
                                                                        {
                                                                            d.forecasted
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface StaffDailyChartProps {
    data: Array<{
        date: string;
        label: string;
        isPast: boolean;
        present: number;
        required: number;
        forecasted: number;
        scheduled: number;
    }>;
    focusRange: "30d" | "14d" | "all";
}

function StaffDailyChart({ data, focusRange }: StaffDailyChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No staffing data for the current filters.
            </div>
        );
    }

    const isPastOnly = focusRange === "30d";
    const isFutureOnly = focusRange === "14d";

    let filtered = data;
    if (isPastOnly) {
        filtered = data.filter((d) => d.isPast);
    } else if (isFutureOnly) {
        filtered = data.filter((d) => !d.isPast);
    }

    if (filtered.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No staffing data for the current filters.
            </div>
        );
    }

    const enriched = filtered.map((d) => ({
        ...d,
        label: d.label,
        // For past days we have actuals & optimal; for future we only want forecasted & scheduled,
        // so set the past-only series to null instead of 0 to avoid the line dropping to the axis.
        Present: d.isPast ? d.present : null,
        Optimal: d.isPast ? d.required : null,
        Forecasted: d.forecasted,
        Scheduled: !d.isPast ? d.scheduled : null,
    }));

    const showPresentAndOptimal = !isFutureOnly; // past 30d or all
    const showScheduled = !isPastOnly; // future 14d or all

    return (
        <LineChart data={enriched}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            {showPresentAndOptimal && (
                <Line
                    type="monotone"
                    dataKey="Present"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={false}
                    name="Present (actual)"
                />
            )}
            {showPresentAndOptimal && (
                <Line
                    type="monotone"
                    dataKey="Optimal"
                    stroke="#0f172a"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Optimal required"
                />
            )}
            <Line
                type="monotone"
                dataKey="Forecasted"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Forecasted need"
            />
            {showScheduled && (
                <Line
                    type="monotone"
                    dataKey="Scheduled"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    name="Scheduled staff"
                />
            )}
        </LineChart>
    );
}

