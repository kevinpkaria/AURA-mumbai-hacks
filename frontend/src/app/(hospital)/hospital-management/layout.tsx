"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TrendingUp, Menu, X, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const sections = [
    {
        name: "Dashboard",
        href: "/hospital-management",
        icon: LayoutDashboard,
        description: "Overview of hospital operations"
    },
    {
        name: "Resource Management",
        href: "/hospital-management/resource-management/surge-prediction",
        icon: TrendingUp,
        description: "AI-powered surge prediction and resource allocation"
    },
    {
        name: "Ask AURA",
        href: "/hospital-management/ask",
        icon: MessageSquare,
        description: "Natural language queries about hospital operations"
    }
];

export default function HospitalManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-xl group-hover:shadow-blue-500/30 group-hover:scale-105 transition-all duration-200">
                                <LayoutDashboard className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                    AURA
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Hospital Management</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {sections.map((section) => {
                            // For Dashboard, match exactly. For others, match if pathname starts with href
                            const isActive = section.href === "/hospital-management"
                                ? pathname === "/hospital-management" || pathname === "/hospital-management/"
                                : pathname?.startsWith(section.href);
                            const Icon = section.icon;

                            return (
                                <Link
                                    key={section.href}
                                    href={section.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className="block"
                                >
                                    <div
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800/50"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                                        )}
                                    >
                                        <Icon 
                                            className={cn(
                                                "h-5 w-5 transition-colors",
                                                isActive 
                                                    ? "text-blue-600 dark:text-blue-400" 
                                                    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                                            )} 
                                        />
                                        <span className={cn(
                                            "font-medium text-sm",
                                            isActive 
                                                ? "text-blue-700 dark:text-blue-400" 
                                                : "text-gray-700 dark:text-gray-300"
                                        )}>
                                            {section.name}
                                        </span>
                                        {isActive && (
                                            <div className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-md flex items-center justify-center">
                                <span className="text-white text-xs font-bold">N</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                © 2025 AURA Healthtech
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto lg:pl-72">
                {/* Top Header with Sign Out */}
                <header className="h-16 border-b bg-background/95 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6 text-primary lg:hidden" />
                        <span className="font-bold lg:hidden">AURA</span>
                        {user && (
                            <span className="text-sm text-muted-foreground hidden lg:block">
                                Welcome back, {user.name}
                            </span>
                        )}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-destructive"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                </header>
                <div className="container mx-auto p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
