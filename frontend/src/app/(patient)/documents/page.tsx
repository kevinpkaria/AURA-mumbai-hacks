"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Trash2, Eye, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            loadDocuments();
        }
    }, [user]);

    const loadDocuments = async () => {
        try {
            const docs = await api.getPatientDocuments(user!.id);
            setDocuments(docs);
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this document?")) {
            try {
                await api.request(`/documents/${id}`, { method: "DELETE" });
                loadDocuments();
            } catch (error) {
                console.error("Failed to delete document:", error);
                alert("Failed to delete document");
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
                <p className="text-muted-foreground">All your uploaded medical documents and analysis results.</p>
            </div>

            {documents.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No Documents Yet</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Upload medical documents in the Dashboard to see them here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc, i) => (
                        <motion.div
                            key={doc.id || i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <FileText className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{doc.name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                                    {doc.document_type && (
                                                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{doc.document_type}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(doc.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                    {doc.summary && (
                                            <div>
                                                <p className="text-sm font-medium mb-2">AI Summary:</p>
                                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                                    {typeof doc.summary === "string" ? doc.summary : doc.summary.summary || "No summary available"}
                                                </p>
                                            </div>
                                    )}
                                    {doc.metrics && doc.metrics.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Extracted Metrics:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.metrics.map((metric: any, idx: number) => (
                                                        <div key={idx} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                                                            <span>{metric.name}:</span> {metric.value} {metric.unit}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                        {doc.file_url && (
                                            <div className="pt-2">
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    View Document
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
