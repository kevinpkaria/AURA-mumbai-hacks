import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function DataSourcesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
                <p className="text-muted-foreground">
                    Manage and monitor connected data feeds
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Connected Data Sources
                    </CardTitle>
                    <CardDescription>
                        External and internal data feeds for AI predictions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted p-6 rounded-lg text-center">
                        <p className="text-sm font-medium mb-2">🚀 Feature In Development</p>
                        <p className="text-xs text-muted-foreground">
                            Data sources will include festival calendars, AQI feeds, health alerts,
                            OPD/IPD volumes, and resource utilization metrics.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
