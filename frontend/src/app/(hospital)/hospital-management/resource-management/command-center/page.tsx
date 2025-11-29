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
    Gauge,
    Users,
    Boxes,
    AlertTriangle,
    ArrowRight,
    CalendarRange,
} from "lucide-react";
import Link from "next/link";

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

interface StaffIssue {
    date: string;
    department: Department;
    role: Role;
    gap: number;
}

interface SupplyIssue {
    supplyName: string;
    department: Department;
    totalGap: number;
}

// Lightweight deterministic dummy data so the command center feels alive even before backend wiring.
function useCommandCenterData() {
    const [staffIssues] = React.useState<StaffIssue[]>(() => {
        const today = new Date();
        const depts: Department[] = [
            "Pulmonology",
            "Cardiology",
            "Neurology",
            "Orthopedics",
            "Obstetrics",
        ];
        const roles: Role[] = [
            "Doctor",
            "Nurse",
            "Emergency Care Staff",
            "Surgeon",
        ];

        let seed = 7;
        const rand = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        const issues: StaffIssue[] = [];
        for (let i = 0; i < 10; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i + 1));
            issues.push({
                date: d.toISOString().slice(0, 10),
                department: depts[i % depts.length],
                role: roles[i % roles.length],
                gap: 5 + Math.round(rand() * 25),
            });
        }
        return issues.sort((a, b) => b.gap - a.gap).slice(0, 6);
    });

    const [supplyIssues] = React.useState<SupplyIssue[]>(() => {
        const items: Array<{ name: string; department: Department }> = [
            { name: "Oxygen masks", department: "Pulmonology" },
            { name: "Dialyzer filters", department: "Nephrology" },
            { name: "ECG electrodes (disposable)", department: "Cardiology" },
            { name: "Insulin", department: "Endocrinology" },
            { name: "Pregnancy test kits", department: "Gynecology" },
            { name: "Blood bags", department: "Hematology" },
            { name: "Delivery kits", department: "Obstetrics" },
        ];

        let seed = 19;
        const rand = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        return items
            .map((item) => ({
                supplyName: item.name,
                department: item.department,
                totalGap: 40 + Math.round(rand() * 120),
            }))
            .sort((a, b) => b.totalGap - a.totalGap)
            .slice(0, 6);
    });

    const highPriorityStaff = staffIssues.slice(0, 3);
    const highPrioritySupplies = supplyIssues.slice(0, 3);

    const totalStaffGap = staffIssues.reduce((s, i) => s + i.gap, 0);
    const totalSupplyGap = supplyIssues.reduce((s, i) => s + i.totalGap, 0);

    return {
        staffIssues,
        supplyIssues,
        highPriorityStaff,
        highPrioritySupplies,
        totalStaffGap,
        totalSupplyGap,
    };
}

export default function CommandCenterPage() {
    const {
        staffIssues,
        supplyIssues,
        highPriorityStaff,
        highPrioritySupplies,
        totalStaffGap,
        totalSupplyGap,
    } = useCommandCenterData();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Gauge className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">
                        Resource Command Center
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    One consolidated view of staffing and supplies actions your
                    hospital should take today.
                </p>
            </div>

            {/* Global summary row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Open staffing issues
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {staffIssues.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total gap of{" "}
                            <span className="font-semibold">
                                {totalStaffGap}
                            </span>{" "}
                            staff across all departments.
                        </p>
                        <Link
                            href="/hospital-management/resource-management/staff-management"
                            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary"
                        >
                            Open staffing dashboard
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Understocked supply lines
                        </CardTitle>
                        <Boxes className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {supplyIssues.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cumulative shortage of{" "}
                            <span className="font-semibold">
                                {totalSupplyGap}
                            </span>{" "}
                            units over last 30 days.
                        </p>
                        <Link
                            href="/hospital-management/resource-management/supplies-management"
                            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary"
                        >
                            Open supplies dashboard
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Today&apos;s focus window
                        </CardTitle>
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-2">
                            Use this center to triage what to fix today, then
                            drill down into detailed dashboards.
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>
                                • Prioritize{" "}
                                <span className="font-semibold">
                                    high‑gap staffing
                                </span>{" "}
                                in critical departments.
                            </li>
                            <li>
                                • Ensure{" "}
                                <span className="font-semibold">
                                    red‑flag supplies
                                </span>{" "}
                                are ordered and in transit.
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Two-column action center */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Staffing side */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Staffing actions (top 6)
                        </CardTitle>
                        <CardDescription>
                            Departments and roles where staff present fell below
                            AI‑recommended levels most frequently.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {staffIssues.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No staffing issues detected in the last 30 days.
                            </p>
                        ) : (
                            <>
                                {highPriorityStaff.map((issue, idx) => (
                                    <div
                                        key={`${issue.date}-${issue.department}-${issue.role}-${idx}`}
                                        className="p-3 border rounded-lg flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                {issue.department}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {issue.role}
                                                {" · "}
                                                {new Date(
                                                    issue.date
                                                ).toLocaleDateString("en-US", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs">
                                            <p className="font-semibold text-red-600">
                                                Gap: {issue.gap} staff
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Consider calling in backup or
                                                reshuffling rosters.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {staffIssues.length > highPriorityStaff.length && (
                                    <p className="text-[11px] text-muted-foreground">
                                        +{" "}
                                        {staffIssues.length -
                                            highPriorityStaff.length}{" "}
                                        additional staffing alerts available in
                                        the detailed dashboard.
                                    </p>
                                )}
                                <Link href="/hospital-management/resource-management/staff-management">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-1 w-full justify-center gap-2"
                                    >
                                        View full staffing details
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Supplies side */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-primary" />
                            Supply actions (top 6)
                        </CardTitle>
                        <CardDescription>
                            High‑risk items where on‑hand stock repeatedly fell
                            below optimal buffer levels.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {supplyIssues.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No supply shortages detected in the last 30
                                days.
                            </p>
                        ) : (
                            <>
                                {highPrioritySupplies.map((issue, idx) => (
                                    <div
                                        key={`${issue.supplyName}-${issue.department}-${idx}`}
                                        className="p-3 border rounded-lg flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                {issue.supplyName}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {issue.department}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs">
                                            <p className="font-semibold text-red-600">
                                                Total gap: {issue.totalGap}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Prioritize purchase order or
                                                vendor follow‑up.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {supplyIssues.length >
                                    highPrioritySupplies.length && (
                                    <p className="text-[11px] text-muted-foreground">
                                        +{" "}
                                        {supplyIssues.length -
                                            highPrioritySupplies.length}{" "}
                                        more items with moderate shortages.
                                    </p>
                                )}
                                <Link href="/hospital-management/resource-management/supplies-management">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-1 w-full justify-center gap-2"
                                    >
                                        View full supplies details
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Critical alerts banner */}
            {(highPriorityStaff.length > 0 ||
                highPrioritySupplies.length > 0) && (
                <Card className="border-amber-300 bg-amber-50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-700" />
                            <CardTitle className="text-sm">
                                Combined critical watchlist
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Snapshot of the single most urgent staffing and
                            supply issues to look at this morning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 text-xs">
                        {highPriorityStaff[0] && (
                            <div>
                                <p className="font-semibold mb-1">
                                    Staffing ·{" "}
                                    {highPriorityStaff[0].department}
                                </p>
                                <p className="text-muted-foreground">
                                    {highPriorityStaff[0].role} gap of{" "}
                                    <span className="font-semibold text-red-700">
                                        {highPriorityStaff[0].gap}
                                    </span>{" "}
                                    on{" "}
                                    {new Date(
                                        highPriorityStaff[0].date
                                    ).toLocaleDateString()}
                                    . Consider rescheduling or adding backup
                                    coverage.
                                </p>
                            </div>
                        )}
                        {highPrioritySupplies[0] && (
                            <div>
                                <p className="font-semibold mb-1">
                                    Supplies ·{" "}
                                    {highPrioritySupplies[0].supplyName}
                                </p>
                                <p className="text-muted-foreground">
                                    Cumulative shortfall of{" "}
                                    <span className="font-semibold text-red-700">
                                        {highPrioritySupplies[0].totalGap}
                                    </span>{" "}
                                    units in {highPrioritySupplies[0].department}.{" "}
                                    Fast‑track replenishment with procurement.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


