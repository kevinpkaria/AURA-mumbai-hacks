"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-muted/20 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Hospital Analytics</h1>
                        <p className="text-muted-foreground">Monitor health trends and predict surges.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background px-3 py-1 rounded-full border">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Data
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard title="Total Patients" value="1,284" change="+12%" icon={Users} />
                    <StatCard title="Active Cases" value="342" change="+5%" icon={Activity} />
                    <StatCard title="Avg. Wait Time" value="14m" change="-2m" icon={TrendingUp} />
                    <StatCard title="Critical Alerts" value="3" change="0" icon={AlertTriangle} alert />
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Symptom Trends (Last 7 Days)</CardTitle>
                            <CardDescription>Most frequently reported symptoms.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <BarChart label="Flu-like Symptoms" value={78} color="bg-blue-500" />
                                <BarChart label="Respiratory Issues" value={65} color="bg-teal-500" />
                                <BarChart label="Migraines" value={42} color="bg-indigo-500" />
                                <BarChart label="Gastrointestinal" value={28} color="bg-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Predicted Surges</CardTitle>
                            <CardDescription>AI-forecasted health events.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        <h3 className="font-semibold text-red-900">High Risk: Seasonal Flu</h3>
                                    </div>
                                    <p className="text-sm text-red-800 mb-2">
                                        Predicted 40% increase in cases over the next 2 weeks based on current symptom patterns.
                                    </p>
                                    <div className="w-full bg-red-200 rounded-full h-2">
                                        <div className="bg-red-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="h-5 w-5 text-yellow-600" />
                                        <h3 className="font-semibold text-yellow-900">Moderate Risk: Allergies</h3>
                                    </div>
                                    <p className="text-sm text-yellow-800 mb-2">
                                        Pollen count rising. Expect 15% increase in respiratory cases.
                                    </p>
                                    <div className="w-full bg-yellow-200 rounded-full h-2">
                                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "45%" }}></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, icon: Icon, alert }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${alert ? "text-red-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{change} from last week</p>
            </CardContent>
        </Card>
    );
}

function BarChart({ label, value, color }: any) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{value}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color}`}
                />
            </div>
        </div>
    );
}
