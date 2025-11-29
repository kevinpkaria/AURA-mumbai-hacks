"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, MapPin, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Input
                                id="name"
                                value={user?.name || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Name cannot be changed. Contact support if you need to update it.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed. Contact support if you need to update it.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Account Type</Label>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Input
                                id="role"
                                value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>Manage your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="gap-2"
                        disabled={loading}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

