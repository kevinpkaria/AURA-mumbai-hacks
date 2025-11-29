"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "day";

interface Appointment {
    id: number;
    datetime: string;
    mode: "online" | "inperson";
    patient_id?: number;
    doctor_id?: number;
    patient?: { name: string };
    doctor?: { name: string };
}

interface CalendarViewProps {
    appointments: Appointment[];
    onAppointmentClick?: (appointment: Appointment) => void;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
}

export function CalendarView({
    appointments,
    onAppointmentClick,
    viewMode: externalViewMode,
    onViewModeChange,
}: CalendarViewProps) {
    const [internalViewMode, setInternalViewMode] = React.useState<ViewMode>("month");
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

    const viewMode = externalViewMode ?? internalViewMode;
    const setViewMode = onViewModeChange ?? setInternalViewMode;

    // Get appointments for a specific date
    const getAppointmentsForDate = (date: Date): Appointment[] => {
        return appointments.filter((apt) => {
            const aptDate = new Date(apt.datetime);
            return (
                aptDate.getFullYear() === date.getFullYear() &&
                aptDate.getMonth() === date.getMonth() &&
                aptDate.getDate() === date.getDate()
            );
        });
    };

    // Get appointments for current month
    const getAppointmentsForMonth = (): Map<number, Appointment[]> => {
        const monthAppointments = new Map<number, Appointment[]>();
        appointments.forEach((apt) => {
            const aptDate = new Date(apt.datetime);
            if (
                aptDate.getFullYear() === currentDate.getFullYear() &&
                aptDate.getMonth() === currentDate.getMonth()
            ) {
                const day = aptDate.getDate();
                if (!monthAppointments.has(day)) {
                    monthAppointments.set(day, []);
                }
                monthAppointments.get(day)!.push(apt);
            }
        });
        return monthAppointments;
    };

    const monthAppointments = getAppointmentsForMonth();

    // Navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    // Calendar grid for month view
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }
        return days;
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Day view appointments
    const dayViewAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

    return (
        <div className="space-y-4">
            {/* Header with view toggle and navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode("month")}
                        className={cn(viewMode === "month" && "bg-primary text-primary-foreground")}
                    >
                        Month
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode("day")}
                        className={cn(viewMode === "day" && "bg-primary text-primary-foreground")}
                    >
                        Day
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {viewMode === "month" && (
                        <>
                            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" onClick={goToToday}>
                                Today
                            </Button>
                            <Button variant="outline" size="icon" onClick={goToNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Month View */}
            {viewMode === "month" && (
                <div className="border rounded-lg p-4 bg-card">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">{monthName}</h2>
                        <p className="text-sm text-muted-foreground">
                            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {/* Day headers */}
                        {dayNames.map((day) => (
                            <div
                                key={day}
                                className="p-2 text-center text-sm font-medium text-muted-foreground"
                            >
                                {day}
                            </div>
                        ))}
                        {/* Calendar days */}
                        {days.map((day, index) => {
                            if (!day) {
                                return <div key={`empty-${index}`} className="p-2" />;
                            }
                            const dayAppointments = monthAppointments.get(day.getDate()) || [];
                            const isToday =
                                day.toDateString() === new Date().toDateString();
                            const isSelected =
                                selectedDate?.toDateString() === day.toDateString();

                            return (
                                <button
                                    key={day.toDateString()}
                                    onClick={() => {
                                        setSelectedDate(day);
                                        setViewMode("day");
                                    }}
                                    className={cn(
                                        "p-2 rounded-md text-sm transition-colors",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isToday && "bg-primary/10 font-semibold",
                                        isSelected && "ring-2 ring-primary",
                                        dayAppointments.length > 0 && "bg-blue-50 dark:bg-blue-950"
                                    )}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <span>{day.getDate()}</span>
                                        {dayAppointments.length > 0 && (
                                            <span className="text-xs font-medium text-primary">
                                                {dayAppointments.length}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Day View */}
            {viewMode === "day" && (
                <div className="border rounded-lg p-4 bg-card">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString("en-US", {
                                          weekday: "long",
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                      })
                                    : "Select a date"}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {dayViewAppointments.length} appointment
                                {dayViewAppointments.length !== 1 ? "s" : ""} on this day
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            Today
                        </Button>
                    </div>
                    {!selectedDate ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Click on a date in month view to see appointments
                        </div>
                    ) : dayViewAppointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No appointments scheduled for this day
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {dayViewAppointments
                                .sort(
                                    (a, b) =>
                                        new Date(a.datetime).getTime() -
                                        new Date(b.datetime).getTime()
                                )
                                .map((appointment) => (
                                    <div
                                        key={appointment.id}
                                        onClick={() => onAppointmentClick?.(appointment)}
                                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {new Date(appointment.datetime).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                                {appointment.patient && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Patient: {appointment.patient.name}
                                                    </div>
                                                )}
                                                {appointment.doctor && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Doctor: {appointment.doctor.name}
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    "text-xs px-2 py-1 rounded-full font-medium",
                                                    appointment.mode === "online"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                )}
                                            >
                                                {appointment.mode === "online" ? "Online" : "In Person"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

