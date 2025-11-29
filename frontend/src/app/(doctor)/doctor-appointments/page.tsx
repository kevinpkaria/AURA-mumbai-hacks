"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, MapPin, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CalendarView } from "@/components/ui/calendar-view";

export default function DoctorAppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedAppointment, setSelectedAppointment] = React.useState<any | null>(null);

    React.useEffect(() => {
        if (user && user.role === "doctor") {
            loadAppointments();
        }
    }, [user]);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            // For doctors, API automatically filters by doctor_id when user is a doctor
            const apts = await api.getAppointments() as any[];
            // Sort by datetime (upcoming first)
            apts.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
            setAppointments(apts);
        } catch (error) {
            console.error("Failed to load appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAppointmentClick = (appointment: any) => {
        setSelectedAppointment(appointment);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
                    <p className="text-muted-foreground">Manage your scheduled patient appointments</p>
                </div>
            </div>

            {/* Appointment count message */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <p className="text-sm text-muted-foreground">
                            You have <span className="font-semibold text-foreground">{appointments.length}</span>{" "}
                            appointment{appointments.length !== 1 ? "s" : ""} scheduled
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Calendar View */}
            <Card>
                <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>View and manage your patient appointments</CardDescription>
                </CardHeader>
                <CardContent>
                    <CalendarView
                        appointments={appointments}
                        onAppointmentClick={handleAppointmentClick}
                    />
                </CardContent>
            </Card>

            {/* Appointment Detail Modal */}
            <AnimatePresence>
                {selectedAppointment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-card border rounded-lg shadow-lg"
                        >
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle>Appointment Details</CardTitle>
                                            <CardDescription className="mt-2">
                                                {new Date(selectedAppointment.datetime).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedAppointment(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {new Date(selectedAppointment.datetime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    {selectedAppointment.mode === "online" ? (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Video className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Video call</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">In-person visit</span>
                                        </div>
                                    )}
                                    {selectedAppointment.patient && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Patient: </span>
                                            <span className="font-medium">{selectedAppointment.patient.name}</span>
                                        </div>
                                    )}
                                    {selectedAppointment.patient?.email && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Email: </span>
                                            <span className="font-medium">{selectedAppointment.patient.email}</span>
                                        </div>
                                    )}
                                    <div className={cn(
                                        "text-xs px-2 py-1 rounded-full font-medium inline-block",
                                        selectedAppointment.mode === "online"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    )}>
                                        {selectedAppointment.mode === "online" ? "Online" : "In Person"}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

