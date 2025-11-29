"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LayoutDashboard, MessageSquare, FileText, LogOut, Menu, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import * as React from "react";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/consultations", label: "Consultations", icon: MessageSquare },
        { href: "/data", label: "Your Data", icon: Activity },
        { href: "/documents", label: "Medical Records", icon: FileText },
        { href: "/patient-appointments", label: "Appointments", icon: Clock },
    ];

    return (
        <div className="flex h-screen bg-muted/20">
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
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                <Activity className="h-6 w-6 text-white" />
                    </div>
                            <div>
                                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                    AURA
                                </span>
                                <p className="text-xs text-muted-foreground -mt-1 hidden sm:block">Autonomous Unified Record Assistant</p>
                            </div>
                        </Link>
                </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start gap-3",
                                        isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                    {/* Footer */}
                <div className="p-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            © 2025 AURA Healthtech
                        </p>
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
            <main className="flex-1 overflow-auto lg:pl-64">
                {/* Top Header with Sign Out */}
                <header className="h-16 border-b bg-background/95 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary lg:hidden" />
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
                <div className="p-6 md:p-8 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
