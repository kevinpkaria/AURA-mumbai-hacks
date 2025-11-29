"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, AlertCircle, ArrowLeft, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Link from "next/link";

interface Hospital {
  id: number;
  name: string;
  city: string;
  address: string | null;
}

export default function DoctorSignUpPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [hospitalId, setHospitalId] = React.useState<number | undefined>(undefined);
  const [hospitals, setHospitals] = React.useState<Hospital[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHospitals, setLoadingHospitals] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load hospitals on mount
  React.useEffect(() => {
    const loadHospitals = async () => {
      try {
        const data = await api.getHospitals();
        setHospitals(data);
      } catch (err: any) {
        console.error("Failed to load hospitals:", err);
        setError("Failed to load hospitals. Please refresh the page.");
      } finally {
        setLoadingHospitals(false);
      }
    };
    loadHospitals();
  }, []);

  // Redirect if already logged in (wait for user state to update)
  React.useEffect(() => {
    if (user && user.role === "doctor") {
      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        router.push("/portal");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hospitalId) {
      setError("Please select a hospital");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, "doctor", hospitalId);
      // Don't redirect here - let useEffect handle it when user state updates
      // This ensures the auth state is properly set before navigation
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err?.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Doctor Sign Up
          </CardTitle>
          <CardDescription className="text-base">
            Create your doctor account to review consultations and provide diagnoses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Dr. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="hospital" className="text-sm font-medium">
                Hospital <span className="text-red-500">*</span>
              </label>
              {loadingHospitals ? (
                <div className="h-11 flex items-center justify-center border rounded-md bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  id="hospital"
                  value={hospitalId || ""}
                  onChange={(e) => setHospitalId(e.target.value ? parseInt(e.target.value) : undefined)}
                  required
                  disabled={loading}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} - {hospital.city}
                    </option>
                  ))}
                </select>
              )}
              {hospitals.length === 0 && !loadingHospitals && (
                <p className="text-xs text-muted-foreground">
                  No hospitals available. Please contact support.
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Doctor Account"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

