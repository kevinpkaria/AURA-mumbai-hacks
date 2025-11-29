"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const DEFAULT_DEPARTMENTS = [
    "Emergency Medicine",
    "Pulmonology",
    "Cardiology",
    "General Medicine",
    "Pediatrics",
    "Orthopedics",
    "Neurology",
    "Oncology"
];

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [step, setStep] = React.useState(1);
    const [hospitalId, setHospitalId] = React.useState<number | null>(null);
    
    // Form data
    const [departments, setDepartments] = React.useState<string[]>(DEFAULT_DEPARTMENTS);
    const [newDepartment, setNewDepartment] = React.useState("");
    const [bedCapacity, setBedCapacity] = React.useState("");
    const [icuCapacity, setIcuCapacity] = React.useState("");
    const [ventilatorCount, setVentilatorCount] = React.useState("");
    const [averagePatients, setAveragePatients] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (user) {
            loadHospitalId();
        }
    }, [user]);

    const loadHospitalId = async () => {
        if (!user) return;
        
        let id = user.hospital_id;
        if (!id && user.role === "admin") {
            try {
                const hospitals = await api.getHospitals();
                if (hospitals && hospitals.length > 0) {
                    id = hospitals[0].id;
                }
            } catch (e) {
                console.error("Failed to load hospitals:", e);
            }
        }
        
        if (id) {
            setHospitalId(id);
            // Initialize average patients for each department
            const initial: Record<string, string> = {};
            departments.forEach(dept => {
                initial[dept] = "";
            });
            setAveragePatients(initial);
        }
    };

    const addDepartment = () => {
        if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
            const updated = [...departments, newDepartment.trim()];
            setDepartments(updated);
            setAveragePatients({ ...averagePatients, [newDepartment.trim()]: "" });
            setNewDepartment("");
        }
    };

    const removeDepartment = (dept: string) => {
        const updated = departments.filter(d => d !== dept);
        setDepartments(updated);
        const updatedPatients = { ...averagePatients };
        delete updatedPatients[dept];
        setAveragePatients(updatedPatients);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!hospitalId) {
            setError("Hospital ID not found. Please contact support.");
            return;
        }

        // Validation
        if (departments.length === 0) {
            setError("Please add at least one department");
            return;
        }

        if (!bedCapacity || !icuCapacity || !ventilatorCount) {
            setError("Please fill in all capacity fields");
            return;
        }

        const missingPatients = departments.filter(dept => !averagePatients[dept] || averagePatients[dept] === "");
        if (missingPatients.length > 0) {
            setError(`Please provide average daily patients for: ${missingPatients.join(", ")}`);
            return;
        }

        try {
            setLoading(true);

            const onboardingData = {
                hospital_id: hospitalId,
                onboarding_data: {
                    departments: departments,
                    bed_capacity: parseInt(bedCapacity),
                    icu_capacity: parseInt(icuCapacity),
                    ventilator_count: parseInt(ventilatorCount),
                    average_daily_patients: Object.fromEntries(
                        Object.entries(averagePatients).map(([dept, val]) => [dept, parseInt(val)])
                    ),
                    timezone: "Asia/Kolkata"
                }
            };

            await api.completeHospitalOnboarding(hospitalId, onboardingData);
            
            // Redirect to dashboard
            router.push("/hospital-management");
        } catch (err: any) {
            console.error("Onboarding failed:", err);
            setError(err?.message || "Failed to complete onboarding. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!hospitalId) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 py-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Hospital Setup</h1>
                <p className="text-muted-foreground">
                    Let's set up your hospital profile to enable AI-powered predictions
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Prerequisite Information
                    </CardTitle>
                    <CardDescription>
                        This information is required for accurate surge predictions and resource management
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Departments */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Departments</Label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={newDepartment}
                                        onChange={(e) => setNewDepartment(e.target.value)}
                                        placeholder="Add department (e.g., Neurology)"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addDepartment();
                                            }
                                        }}
                                    />
                                    <Button type="button" onClick={addDepartment} variant="outline">
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {departments.map((dept) => (
                                        <div
                                            key={dept}
                                            className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-md"
                                        >
                                            <span className="text-sm">{dept}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeDepartment(dept)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Capacity Information */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="bedCapacity">Total Bed Capacity</Label>
                                <Input
                                    id="bedCapacity"
                                    type="number"
                                    min="1"
                                    value={bedCapacity}
                                    onChange={(e) => setBedCapacity(e.target.value)}
                                    placeholder="e.g., 500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icuCapacity">ICU Capacity</Label>
                                <Input
                                    id="icuCapacity"
                                    type="number"
                                    min="1"
                                    value={icuCapacity}
                                    onChange={(e) => setIcuCapacity(e.target.value)}
                                    placeholder="e.g., 50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ventilatorCount">Ventilator Count</Label>
                                <Input
                                    id="ventilatorCount"
                                    type="number"
                                    min="0"
                                    value={ventilatorCount}
                                    onChange={(e) => setVentilatorCount(e.target.value)}
                                    placeholder="e.g., 20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Average Daily Patients by Department */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Average Daily Patients by Department</Label>
                            <div className="grid gap-4 md:grid-cols-2">
                                {departments.map((dept) => (
                                    <div key={dept} className="space-y-2">
                                        <Label htmlFor={`patients-${dept}`}>{dept}</Label>
                                        <Input
                                            id={`patients-${dept}`}
                                            type="number"
                                            min="0"
                                            value={averagePatients[dept] || ""}
                                            onChange={(e) =>
                                                setAveragePatients({
                                                    ...averagePatients,
                                                    [dept]: e.target.value
                                                })
                                            }
                                            placeholder="Average daily patients"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900 text-sm">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Completing Setup...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

