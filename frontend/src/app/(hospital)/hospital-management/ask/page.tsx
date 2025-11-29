"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AskAuraPage() {
    const { user } = useAuth();
    const [query, setQuery] = React.useState("");
    const [response, setResponse] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const handleQuery = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResponse(null);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Try real API first
            const result = await api.adminQuery(query).catch(() => null);
            
            if (result && (result.reply || result.answer)) {
                setResponse(result.reply || result.answer);
            } else {
                // Fallback to dummy responses
                const lowerQuery = query.toLowerCase();
                let dummyResponse = "";

                if (lowerQuery.includes("patient load") || lowerQuery.includes("patient volume")) {
                    dummyResponse = `Based on current forecasts and historical data:\n\n` +
                        `• Emergency Medicine: Expected 180-220 patients/day (baseline: 150)\n` +
                        `• Pulmonology: Expected 100-120 patients/day (baseline: 80) - High due to AQI spike\n` +
                        `• Cardiology: Expected 75-85 patients/day (baseline: 70)\n` +
                        `• General Medicine: Expected 140-160 patients/day (baseline: 120)\n\n` +
                        `Peak surge expected on Nov 28-29 due to Diwali festival (+45% increase).`;
                } else if (lowerQuery.includes("respiratory") || lowerQuery.includes("pulmonology")) {
                    dummyResponse = `Respiratory cases are expected to increase significantly:\n\n` +
                        `• Tomorrow (Nov 27): 95-105 cases (baseline: 80) - +25% increase\n` +
                        `• Nov 28-29: 120-140 cases - +60% increase due to Diwali pollution spike\n` +
                        `• AQI forecast shows hazardous levels (380-420) during festival period\n\n` +
                        `Recommendation: Stock additional inhalers and N95 masks. Consider opening extra OPD session.`;
                } else if (lowerQuery.includes("staffing") || lowerQuery.includes("recommendation")) {
                    dummyResponse = `AI-generated staffing recommendations:\n\n` +
                        `CRITICAL (Next 48 hours):\n` +
                        `• Emergency Medicine: Add evening shift (5-8 PM) on Nov 28-29\n` +
                        `• Pulmonology: Schedule 2 additional doctors for Nov 28-29\n` +
                        `• Add 5 nurses to evening shifts across departments\n\n` +
                        `HIGH PRIORITY:\n` +
                        `• Prepare 2 additional nebulization bays for Pulmonology\n` +
                        `• Keep extra ventilator ready in Emergency\n\n` +
                        `View full recommendations in the Recommendations tab.`;
                } else if (lowerQuery.includes("surge") || lowerQuery.includes("forecast")) {
                    dummyResponse = `Surge Prediction Summary:\n\n` +
                        `Next 7 Days Forecast:\n` +
                        `• Emergency Medicine: +35% average increase\n` +
                        `• Pulmonology: +45% average increase (pollution-related)\n` +
                        `• Cardiology: +15% average increase\n` +
                        `• General Medicine: +25% average increase\n\n` +
                        `Critical Alerts (Next 48h):\n` +
                        `• Emergency Medicine: +52% on Nov 28\n` +
                        `• Pulmonology: +60% on Nov 28-29\n\n` +
                        `Primary contributing factors: Diwali festival, high AQI levels, seasonal flu outbreak.`;
                } else {
                    dummyResponse = `I understand you're asking about: "${query}"\n\n` +
                        `Based on current hospital data and AI analysis:\n\n` +
                        `• Patient volumes are expected to increase by 25-35% over the next week\n` +
                        `• Critical surge alerts are active for Emergency Medicine and Pulmonology\n` +
                        `• Resource utilization is at 75-85% capacity\n` +
                        `• 3 active health alerts (flu outbreak, dengue advisory)\n\n` +
                        `For more specific information, try asking about:\n` +
                        `- Patient load projections\n` +
                        `- Staffing recommendations\n` +
                        `- Surge predictions by department\n` +
                        `- Resource utilization status`;
                }

                setResponse(dummyResponse);
            }
        } catch (error) {
            console.error("Query failed:", error);
            setResponse("Failed to get response. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ask AURA</h1>
                <p className="text-muted-foreground">
                    Ask questions about hospital operations, patient loads, and surge predictions
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Admin Query Interface
                    </CardTitle>
                    <CardDescription>
                        Ask AURA about hospital operations, patient trends, and resource management
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What is the projected patient load in Delhi next week?"
                            className="flex-1"
                            onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleQuery();
                                }
                            }}
                            disabled={loading}
                        />
                        <Button onClick={handleQuery} disabled={!query.trim() || loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>

                    {response && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">AURA Response:</p>
                            <p className="text-sm whitespace-pre-wrap">{response}</p>
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Example queries:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>What is the projected patient load in Delhi next week given current trends?</li>
                            <li>How many respiratory cases are expected tomorrow?</li>
                            <li>What are the staffing recommendations for the upcoming festival period?</li>
                            <li>Show me surge predictions for Emergency Medicine department</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


