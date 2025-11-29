"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect if already logged in - but only once, prevent loops
  React.useEffect(() => {
    if (user && !loading && !error) {
      // Small delay to prevent immediate redirect loops
      const timer = setTimeout(() => {
        if (user.role === "patient") {
          window.location.href = "/dashboard";
        } else if (user.role === "doctor") {
          window.location.href = "/portal";
        } else if (user.role === "admin") {
          window.location.href = "/hospital-management/consultations";
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Login and get user with role directly from response
      const loggedInUser = await login(email, password);
      
      // Verify user was stored
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("aura_user") : null;
      if (!storedUser) {
        setError("Failed to store user data. Please try again.");
        setLoading(false);
        return;
      }
      
      // Redirect immediately using window.location for instant navigation
      if (loggedInUser.role === "patient") {
        window.location.href = "/dashboard";
      } else if (loggedInUser.role === "doctor") {
        window.location.href = "/portal";
      } else if (loggedInUser.role === "admin") {
        window.location.href = "/hospital-management/consultations";
      } else {
        setError("Unknown user role. Please contact support.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || "Failed to authenticate. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
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
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to your AURA account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have an account? Choose your role:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/signup/patient">
                  <Button variant="outline" className="w-full">
                    Sign Up as Patient
                  </Button>
                </Link>
                <Link href="/signup/doctor">
                  <Button variant="outline" className="w-full">
                    Sign Up as Doctor
                  </Button>
                </Link>
                <Link href="/signup/hospital">
                  <Button variant="outline" className="w-full">
                    Sign Up as Hospital
                  </Button>
                </Link>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

