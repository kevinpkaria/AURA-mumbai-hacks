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
    Boxes,
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

interface Supply {
    id: string;
    name: string;
    department: Department;
}

interface SupplyRecord {
    date: string; // ISO date
    supplyId: string;
    department: Department;
    name: string;
    // Past: actual & optimal vs predicted; Future: predicted vs on-order/stocked
    present: number;
    optimal: number;
    predicted: number;
    stocked?: number;
    isPast: boolean;
}

const SUPPLIES: Supply[] = [
    // Pulmonology
    { id: "oxygen-masks", name: "Oxygen masks", department: "Pulmonology" },
    { id: "inhalers", name: "Inhalers (Salbutamol)", department: "Pulmonology" },
    { id: "budesonide-nebules", name: "Corticosteroid nebules (Budesonide)", department: "Pulmonology" },
    { id: "ventilator-tubing", name: "Ventilator tubing sets", department: "Pulmonology" },
    { id: "nebulization-mouthpieces", name: "Nebulization mouthpieces", department: "Pulmonology" },
    { id: "pulmo-n95-masks", name: "N95 masks", department: "Pulmonology" },
    { id: "breathing-circuits", name: "Disposable breathing circuits", department: "Pulmonology" },
    // Hepatology
    { id: "lft-kits", name: "LFT test kits", department: "Hepatology" },
    { id: "antiviral-drugs", name: "Antiviral drugs", department: "Hepatology" },
    { id: "vitamin-k", name: "Vitamin K vials", department: "Hepatology" },
    { id: "albumin", name: "Albumin solution", department: "Hepatology" },
    { id: "hepato-iv-cannulas", name: "IV cannulas", department: "Hepatology" },
    { id: "lactulose", name: "Lactulose sachets", department: "Hepatology" },
    { id: "hepato-ppe-gloves", name: "PPE gloves", department: "Hepatology" },
    // Gastroenterology
    { id: "ppi", name: "PPI medicines (Omeprazole)", department: "Gastroenterology" },
    { id: "antiemetics", name: "Antiemetics (Ondansetron)", department: "Gastroenterology" },
    { id: "ors", name: "ORS packets", department: "Gastroenterology" },
    { id: "colonoscopy-consumables", name: "Colonoscopy consumables", department: "Gastroenterology" },
    { id: "biopsy-forceps", name: "Biopsy forceps (disposable)", department: "Gastroenterology" },
    { id: "antidiarrheals", name: "Antidiarrheal medicines", department: "Gastroenterology" },
    { id: "gi-iv-saline", name: "IV saline", department: "Gastroenterology" },
    { id: "gi-contrast", name: "GI contrast media", department: "Gastroenterology" },
    // Cardiology
    { id: "antihypertensives", name: "Antihypertensive medicines", department: "Cardiology" },
    { id: "cardio-heparin", name: "Anticoagulants (Heparin)", department: "Cardiology" },
    { id: "aspirin", name: "Aspirin", department: "Cardiology" },
    { id: "nitroglycerin", name: "Nitroglycerin tablets/sprays", department: "Cardiology" },
    { id: "cardio-iv-lines", name: "IV lines", department: "Cardiology" },
    { id: "ecg-electrodes", name: "ECG electrodes (disposable)", department: "Cardiology" },
    { id: "cardiac-enzyme-kits", name: "Cardiac enzyme test kits", department: "Cardiology" },
    // Neurology
    { id: "anti-seizure", name: "Anti‑seizure meds", department: "Neurology" },
    { id: "mannitol", name: "Mannitol IV bags", department: "Neurology" },
    { id: "lp-kits", name: "Lumbar puncture kits", department: "Neurology" },
    { id: "neuro-steroids", name: "Steroids (Dexamethasone)", department: "Neurology" },
    { id: "neuro-ppe-gloves", name: "PPE gloves", department: "Neurology" },
    { id: "infusion-sets", name: "Infusion sets", department: "Neurology" },
    // Nephrology
    { id: "dialyzer-filters", name: "Dialyzer filters", department: "Nephrology" },
    { id: "dialysis-tubing", name: "Dialysis tubing", department: "Nephrology" },
    { id: "nephro-heparin", name: "Heparin", department: "Nephrology" },
    { id: "potassium-binders", name: "Potassium binders", department: "Nephrology" },
    { id: "epo", name: "Erythropoietin vials", department: "Nephrology" },
    { id: "nephro-iv-fluids", name: "IV fluids", department: "Nephrology" },
    { id: "nephro-catheters", name: "Catheters", department: "Nephrology" },
    // Urology
    { id: "foley", name: "Foley catheters", department: "Urology" },
    { id: "nelaton", name: "Nelaton catheters", department: "Urology" },
    { id: "uro-antibiotics", name: "Antibiotics", department: "Urology" },
    { id: "uro-blades", name: "Surgical blades", department: "Urology" },
    { id: "urine-strips", name: "Urine test strips", department: "Urology" },
    { id: "uro-sterile-gloves", name: "Sterile gloves", department: "Urology" },
    { id: "irrigation-fluids", name: "Irrigation fluids", department: "Urology" },
    // Orthopedics
    { id: "pop", name: "Plaster of Paris (POP)", department: "Orthopedics" },
    { id: "ortho-bandages", name: "Orthopedic bandages", department: "Orthopedics" },
    { id: "nsaids", name: "NSAID pain medicines", department: "Orthopedics" },
    { id: "screws-plates", name: "Screws/plates (consumable)", department: "Orthopedics" },
    { id: "sterile-dressings", name: "Sterile dressings", department: "Orthopedics" },
    { id: "ortho-antibiotics", name: "Antibiotics", department: "Orthopedics" },
    { id: "gauze-rolls", name: "Gauze rolls", department: "Orthopedics" },
    // Hematology
    { id: "blood-tubes", name: "Blood collection tubes", department: "Hematology" },
    { id: "blood-bags", name: "Blood bags", department: "Hematology" },
    { id: "hema-anticoagulants", name: "Anticoagulants", department: "Hematology" },
    { id: "cbc-kits", name: "CBC reagent kits", department: "Hematology" },
    { id: "iron-supplements", name: "Iron supplements", department: "Hematology" },
    { id: "sterile-needles", name: "Sterile needles", department: "Hematology" },
    { id: "hema-gloves", name: "Gloves", department: "Hematology" },
    // Dermatology
    { id: "antifungal-creams", name: "Antifungal creams", department: "Dermatology" },
    { id: "antihistamines", name: "Antihistamine tablets", department: "Dermatology" },
    { id: "steroid-creams", name: "Steroid creams", department: "Dermatology" },
    { id: "sunscreens", name: "Sunscreens", department: "Dermatology" },
    { id: "derm-blades", name: "Surgical blades", department: "Dermatology" },
    { id: "patch-test-kits", name: "Patch test kits", department: "Dermatology" },
    { id: "derm-drapes", name: "Disposable drapes", department: "Dermatology" },
    // Ophthalmology
    { id: "abx-eye-drops", name: "Antibiotic eye drops", department: "Ophthalmology" },
    { id: "artificial-tears", name: "Artificial tears", department: "Ophthalmology" },
    { id: "eye-pads", name: "Disposable eye pads", department: "Ophthalmology" },
    { id: "iols", name: "Intraocular lenses (IOLs)", department: "Ophthalmology" },
    { id: "ophth-blades", name: "Surgical blades", department: "Ophthalmology" },
    { id: "ophth-drapes", name: "Sterile drapes", department: "Ophthalmology" },
    { id: "dilation-drops", name: "Eye dilation drops", department: "Ophthalmology" },
    // ENT
    { id: "nasal-steroids", name: "Nasal steroid sprays", department: "ENT" },
    { id: "ent-abx-drops", name: "Antibiotic ear/nose drops", department: "ENT" },
    { id: "ear-wicks", name: "Ear wicks", department: "ENT" },
    { id: "tongue-depressors", name: "Tongue depressors", department: "ENT" },
    { id: "surgical-sponges", name: "Surgical sponges", department: "ENT" },
    { id: "ent-masks", name: "PPE masks", department: "ENT" },
    { id: "suction-tips", name: "Suction tips (disposable)", department: "ENT" },
    // Endocrinology
    { id: "insulin", name: "Insulin", department: "Endocrinology" },
    { id: "thyroid-meds", name: "Thyroid medications", department: "Endocrinology" },
    { id: "glucose-strips", name: "Glucose strips", department: "Endocrinology" },
    { id: "hba1c-kits", name: "HBA1C test kits", department: "Endocrinology" },
    { id: "syringes", name: "Syringes", department: "Endocrinology" },
    { id: "dextrose-iv", name: "Dextrose IV", department: "Endocrinology" },
    { id: "ketone-strips", name: "Ketone strips", department: "Endocrinology" },
    // Gynecology
    { id: "pregnancy-kits", name: "Pregnancy test kits", department: "Gynecology" },
    { id: "gyn-antibiotics", name: "Antibiotics", department: "Gynecology" },
    { id: "hormonal-pills", name: "Hormonal pills", department: "Gynecology" },
    { id: "pap-smear-consumables", name: "Pap smear consumables", department: "Gynecology" },
    { id: "gyn-drapes", name: "Sterile drapes", department: "Gynecology" },
    { id: "gyn-painkillers", name: "Painkillers", department: "Gynecology" },
    { id: "gyn-gloves", name: "Gloves", department: "Gynecology" },
    // Obstetrics
    { id: "oxytocin", name: "Oxytocin vials", department: "Obstetrics" },
    { id: "obs-iv-fluids", name: "IV fluids", department: "Obstetrics" },
    { id: "delivery-kits", name: "Delivery kits", department: "Obstetrics" },
    { id: "neonatal-suction", name: "Neonatal suction disposables", department: "Obstetrics" },
    { id: "cord-clamps", name: "Cord clamps", department: "Obstetrics" },
    { id: "sterile-gowns", name: "Sterile gowns", department: "Obstetrics" },
    { id: "obs-antibiotics", name: "Antibiotics", department: "Obstetrics" },
];

const DEPARTMENTS: Department[] = Array.from(
    new Set(SUPPLIES.map((s) => s.department))
) as Department[];

function generateDummySupplyData(): SupplyRecord[] {
    const records: SupplyRecord[] = [];
    const today = new Date();

    const addDays = (base: Date, days: number) => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    let seed = 101;
    const rand = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    for (let offset = -29; offset <= 14; offset++) {
        const currentDate = addDays(today, offset);
        const isPast = offset <= 0;

        SUPPLIES.forEach((s, idx) => {
            const base = 40 + (idx % 7) * 10;

            const optimal = Math.round(
                base * (1 + (rand() - 0.5) * 0.2)
            );
            const predicted = Math.max(
                5,
                Math.round(optimal * (1 + (rand() - 0.5) * 0.25))
            );

            let present = optimal;
            let stocked: number | undefined;

            if (isPast) {
                const shortageChance = 0.15 + (idx % 4) * 0.03;
                const overstockChance = 0.12;
                const r = rand();
                if (r < shortageChance) {
                    present = Math.max(
                        0,
                        optimal - Math.round(5 + rand() * 20)
                    );
                } else if (r < shortageChance + overstockChance) {
                    present = optimal + Math.round(5 + rand() * 20);
                } else {
                    present =
                        optimal + Math.round((rand() - 0.5) * 10);
                }
            } else {
                stocked = Math.max(
                    0,
                    Math.round(predicted * (0.85 + rand() * 0.25))
                );
                present = 0;
            }

            records.push({
                date: currentDate.toISOString().slice(0, 10),
                supplyId: s.id,
                department: s.department,
                name: s.name,
                present,
                optimal,
                predicted,
                stocked,
                isPast,
            });
        });
    }

    return records;
}

export default function SuppliesManagementPage() {
    const [selectedDepartment, setSelectedDepartment] =
        React.useState<Department | "all">("all");
    const [selectedSupply, setSelectedSupply] = React.useState<string | "all">(
        "all"
    );
    const [focusRange, setFocusRange] =
        React.useState<"30d" | "14d" | "all">("30d");

    const allRecords = React.useMemo(() => generateDummySupplyData(), []);

    const visibleSupplies = React.useMemo(() => {
        const filtered = selectedDepartment === "all"
            ? SUPPLIES
            : SUPPLIES.filter((s) => s.department === selectedDepartment);
        return filtered;
    }, [selectedDepartment]);

    const filteredRecords = React.useMemo(() => {
        return allRecords.filter((r) => {
            const matchesDept =
                selectedDepartment === "all" ||
                r.department === selectedDepartment;
            const matchesSupply =
                selectedSupply === "all" || r.supplyId === selectedSupply;
            return matchesDept && matchesSupply;
        });
    }, [allRecords, selectedDepartment, selectedSupply]);

    const dailyAggregates = React.useMemo(() => {
        const map = new Map<
            string,
            {
                date: string;
                label: string;
                isPast: boolean;
                present: number;
                optimal: number;
                predicted: number;
                stocked: number;
            }
        >();

        filteredRecords.forEach((r) => {
            const existing =
                map.get(r.date) || {
                    date: r.date,
                    label: new Date(r.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    }),
                    isPast: r.isPast,
                    present: 0,
                    optimal: 0,
                    predicted: 0,
                    stocked: 0,
                };

            existing.isPast = r.isPast;
            existing.present += r.present;
            existing.optimal += r.optimal;
            existing.predicted += r.predicted;
            existing.stocked += r.stocked || 0;
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

    // Understocked items across all departments for past 30 days
    const understockedSummary = React.useMemo(() => {
        const today = new Date();
        const cutoff = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

        const bySupply = new Map<
            string,
            {
                supplyId: string;
                name: string;
                department: Department;
                totalGap: number;
                daysUnderstocked: number;
                lastDate: string | null;
            }
        >();

        allRecords.forEach((r) => {
            if (!r.isPast) return;
            const d = new Date(r.date);
            if (d.getTime() < cutoff.getTime() || d.getTime() > today.getTime()) {
                return;
            }
            const gap = r.optimal - r.present;
            if (gap <= 0) return;

            const existing =
                bySupply.get(r.supplyId) || {
                    supplyId: r.supplyId,
                    name: r.name,
                    department: r.department,
                    totalGap: 0,
                    daysUnderstocked: 0,
                    lastDate: null,
                };

            existing.totalGap += gap;
            existing.daysUnderstocked += 1;
            if (!existing.lastDate || r.date > existing.lastDate) {
                existing.lastDate = r.date;
            }

            bySupply.set(r.supplyId, existing);
        });

        const items = Array.from(bySupply.values()).sort(
            (a, b) => b.totalGap - a.totalGap
        );

        const top = items.slice(0, 8);

        const totalShortage = top.reduce(
            (sum, i) => sum + i.totalGap,
            0
        );

        return {
            items: top,
            totalShortage,
            count: items.length,
        };
    }, [allRecords]);

    const summary = React.useMemo(() => {
        const past = dailyAggregates.filter((d) => d.isPast);
        if (past.length === 0) {
            return {
                avgPresent: 0,
                avgOptimal: 0,
                avgPredicted: 0,
                understockedDays: 0,
            };
        }
        const totalPresent = past.reduce((sum, d) => sum + d.present, 0);
        const totalOptimal = past.reduce((sum, d) => sum + d.optimal, 0);
        const totalPredicted = past.reduce(
            (sum, d) => sum + d.predicted,
            0
        );
        const understockedDays = past.filter(
            (d) => d.present < d.optimal
        ).length;

        return {
            avgPresent: Math.round(totalPresent / past.length),
            avgOptimal: Math.round(totalOptimal / past.length),
            avgPredicted: Math.round(totalPredicted / past.length),
            understockedDays,
        };
    }, [dailyAggregates]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Supplies Management Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Track current stock, AI‑predicted consumption, and optimal
                    buffer levels across all clinical departments.
                </p>
            </div>

            {/* Top summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg. daily stock on hand (last 30 days)
                        </CardTitle>
                        <Boxes className="h-4 w-4 text-muted-foreground" />
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
                            {selectedSupply !== "all" &&
                                ` · ${visibleSupplies.find(
                                    (s) => s.id === selectedSupply
                                )?.name ?? ""}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg. optimal stock level (last 30 days)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.avgOptimal}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            AI‑estimated buffer including surge risk
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Understocked days (last 30 days)
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {summary.understockedDays}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Where on‑hand stock fell below optimal level
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Global filters */}
            <Card id="supplies-filters">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-4 w-4 text-primary" />
                            Global filters
                        </CardTitle>
                        <CardDescription>
                            Slice supply history and forecasts by department and
                            item.
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
                            onChange={(e) => {
                                const dept = e.target.value as
                                    | Department
                                    | "all";
                                setSelectedDepartment(dept);
                                setSelectedSupply("all");
                            }}
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
                            Supply item
                        </label>
                        <select
                            value={selectedSupply}
                            onChange={(e) =>
                                setSelectedSupply(e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        >
                            <option value="all">All supplies</option>
                            {visibleSupplies.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
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

            {/* Daily supply requirements */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-primary" />
                            Daily supply requirements
                        </CardTitle>
                        <CardDescription>
                            Past days show{" "}
                            <span className="font-medium">
                                present, predicted usage, and optimal buffer
                            </span>
                            . Future days show{" "}
                            <span className="font-medium">
                                AI‑predicted usage vs stocked/on‑order
                            </span>
                            .
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 self-start"
                        onClick={() =>
                            document
                                .getElementById("supplies-filters")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                    >
                        <Filter className="h-4 w-4" />
                        Filter by department & item
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <SuppliesDailyChart
                                data={dailyAggregates}
                                focusRange={focusRange}
                            />
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Use this to quickly see where{" "}
                        <span className="font-medium">
                            today&apos;s stock is drifting below AI‑recommended
                        </span>{" "}
                        levels and whether future days are already covered by
                        on‑order stock.
                    </p>
                </CardContent>
            </Card>

            {/* Understocked items & action items */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Understocked supplies */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            High‑impact supply shortages (last 30 days)
                        </CardTitle>
                        <CardDescription>
                            Ranked list of items where stock repeatedly fell
                            below optimal levels, with department context.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {understockedSummary.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No understocked items detected in the last 30
                                days.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {understockedSummary.items.map((item) => (
                                    <div
                                        key={item.supplyId}
                                        className="p-3 border rounded-lg space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {item.name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {item.department}
                                                </p>
                                            </div>
                                            <div className="text-right text-xs">
                                                <p className="font-semibold">
                                                    Total gap:{" "}
                                                    {item.totalGap} units
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Understocked on{" "}
                                                    <span className="font-semibold">
                                                        {
                                                            item.daysUnderstocked
                                                        }
                                                    </span>{" "}
                                                    days
                                                </p>
                                                {item.lastDate && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Last issue:{" "}
                                                        {new Date(
                                                            item.lastDate
                                                        ).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-md border bg-amber-50/60 px-3 py-2 text-xs text-amber-900 flex items-center justify-between">
                                            <span>
                                                Suggested action:{" "}
                                                <span className="font-semibold">
                                                    Increase buffer stock
                                                </span>{" "}
                                                and link this item to automated
                                                re‑ordering rules.
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Today & upcoming 7 days snapshot */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-primary" />
                            Today & next 7 days
                        </CardTitle>
                        <CardDescription>
                            Quick view of supply sufficiency around today for
                            selected filters.
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
                                const base = new Date();
                                const dDate = new Date(d.date);
                                const diffDays = Math.round(
                                    (dDate.getTime() - base.getTime()) /
                                        (24 * 60 * 60 * 1000)
                                );
                                return diffDays > 0 && diffDays <= 7;
                            });

                            const futureGaps = next7.filter(
                                (d) => d.stocked < d.predicted
                            );

                            return (
                                <>
                                    <div>
                                        <p className="text-xs font-semibold mb-1">
                                            Today
                                        </p>
                                        {today ? (
                                            <p className="text-xs text-muted-foreground">
                                                On hand{" "}
                                                <span className="font-semibold">
                                                    {today.present}
                                                </span>{" "}
                                                / Optimal{" "}
                                                <span className="font-semibold">
                                                    {today.optimal}
                                                </span>{" "}
                                                {today.present <
                                                today.optimal ? (
                                                    <span className="ml-1 text-red-600">
                                                        (Understocked)
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
                                                    {futureGaps.length} days
                                                    with predicted usage above
                                                    stocked/on‑order levels.
                                                </p>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {futureGaps
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
                                                                    Stocked{" "}
                                                                    <span className="font-semibold">
                                                                        {
                                                                            d.stocked
                                                                        }
                                                                    </span>{" "}
                                                                    / Pred.{" "}
                                                                    <span className="font-semibold">
                                                                        {
                                                                            d.predicted
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

interface SuppliesDailyChartProps {
    data: Array<{
        date: string;
        label: string;
        isPast: boolean;
        present: number;
        optimal: number;
        predicted: number;
        stocked: number;
    }>;
    focusRange: "30d" | "14d" | "all";
}

function SuppliesDailyChart({
    data,
    focusRange,
}: SuppliesDailyChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No supply data for the current filters.
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
                No supply data for the current filters.
            </div>
        );
    }

    const enriched = filtered.map((d) => ({
        ...d,
        label: d.label,
        OnHand: d.isPast ? d.present : null,
        Optimal: d.isPast ? d.optimal : null,
        Predicted: d.predicted,
        Stocked: !d.isPast ? d.stocked : null,
    }));

    const showOnHandAndOptimal = !isFutureOnly;
    const showStocked = !isPastOnly;

    return (
        <LineChart data={enriched}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            {showOnHandAndOptimal && (
                <Line
                    type="monotone"
                    dataKey="OnHand"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={false}
                    name="On hand (actual)"
                />
            )}
            {showOnHandAndOptimal && (
                <Line
                    type="monotone"
                    dataKey="Optimal"
                    stroke="#0f172a"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Optimal buffer"
                />
            )}
            <Line
                type="monotone"
                dataKey="Predicted"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Predicted usage"
            />
            {showStocked && (
                <Line
                    type="monotone"
                    dataKey="Stocked"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    name="Stocked / on‑order"
                />
            )}
        </LineChart>
    );
}


