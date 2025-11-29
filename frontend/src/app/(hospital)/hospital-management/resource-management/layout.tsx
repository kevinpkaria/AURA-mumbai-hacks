"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TrendingUp, FileText, Database, BarChart3, Gauge } from "lucide-react";

const subSections = [
    {
        name: "Command Center",
        href: "/hospital-management/resource-management/command-center",
        icon: Gauge,
        description: "Single view of critical actions"
    },
    {
        name: "Surge Prediction",
        href: "/hospital-management/resource-management/surge-prediction",
        icon: TrendingUp,
        description: "7-day forecasts and AI predictions"
    },
    {
        name: "Staff Management",
        href: "/hospital-management/resource-management/staff-management",
        icon: BarChart3,
        description: "Past and projected staffing across departments"
    },
    {
        name: "Supplies Management",
        href: "/hospital-management/resource-management/supplies-management",
        icon: Database,
        description: "Inventory levels and AI-recommended stock"
    },
    {
        name: "Data Sources",
        href: "/hospital-management/resource-management/data-sources",
        icon: Database,
        description: "Manage connected data feeds"
    }
];

export default function ResourceManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
            {/* Sub-navigation tabs */}
            <div className="flex gap-2 border-b overflow-x-auto">
                {subSections.map((section) => {
                    const isActive = pathname === section.href;
                    const Icon = section.icon;

                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                                isActive
                                    ? "border-primary text-primary font-medium"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{section.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
