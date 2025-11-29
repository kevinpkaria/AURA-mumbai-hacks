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

        try {
            const result = await api.adminQuery(query);
            setResponse(result.answer || "No response");
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


