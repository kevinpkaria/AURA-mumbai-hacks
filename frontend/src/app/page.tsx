"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  User, 
  Stethoscope, 
  Building2, 
  Activity, 
  FileText, 
  Brain,
  Shield,
  Zap,
  CheckCircle2,
  Sparkles,
  Heart,
  TrendingUp,
  MessageSquare,
  BarChart3
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="container mx-auto px-6 h-20 flex items-center">
          <Link 
            href="/" 
            className="flex items-center gap-3 group cursor-pointer transition-opacity hover:opacity-80 flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              AURA
            </span>
              <p className="text-xs text-muted-foreground -mt-1 hidden sm:block">Autonomous Unified Record Assistant</p>
          </div>
          </Link>
          <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50 mx-auto">
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('features');
                if (element) {
                  const offset = 80; // Navbar height
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - offset;
                  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('how-it-works');
                if (element) {
                  const offset = 80; // Navbar height
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - offset;
                  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
            >
              How It Works
            </a>
            <a 
              href="#about" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('about');
                if (element) {
                  const offset = 80; // Navbar height
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - offset;
                  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
            >
              About
            </a>
          </div>
          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            <Link href="/login">
              <Button size="sm" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all font-medium">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

        {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent leading-tight">
              Connecting Care,
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Intelligently
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Revolutionize healthcare with AI-driven consultations, smart record management, 
              and seamless doctor-patient collaboration.
            </p>
            
            <div className="flex items-center justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
                    </div>
            </motion.div>

          {/* Portal Cards */}
            <motion.div
            initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto"
          >
            <PortalCard
              href="/login"
              icon={<User className="h-6 w-6" />}
              title="Patient Portal"
              description="Chat with AI, upload documents, and track your health metrics"
              gradient="from-blue-500 to-cyan-500"
              delay={0.5}
            />
            <PortalCard
              href="/login"
              icon={<Stethoscope className="h-6 w-6" />}
              title="Doctor Portal"
              description="Review consultations, provide diagnoses, and prescribe treatments"
              gradient="from-green-500 to-emerald-500"
              delay={0.6}
            />
            <PortalCard
              href="/login"
              icon={<Building2 className="h-6 w-6" />}
              title="Hospital Management"
              description="View analytics, monitor consultations, and manage operations"
              gradient="from-purple-500 to-pink-500"
              delay={0.7}
            />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features for
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"> Modern Healthcare</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to streamline healthcare delivery and improve patient outcomes
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Brain className="h-8 w-8" />}
              title="AI-Powered Diagnosis"
              description="Advanced AI analyzes symptoms and provides preliminary assessments with risk level indicators"
              gradient="from-purple-500 to-pink-500"
              delay={0.1}
            />
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              title="Smart Records"
              description="Upload and organize medical documents. AI structures your data for instant access and insights"
              gradient="from-blue-500 to-cyan-500"
              delay={0.2}
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Doctor Verified"
              description="All AI findings are reviewed by licensed doctors who issue prescriptions and ensure accuracy"
              gradient="from-green-500 to-emerald-500"
              delay={0.3}
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Real-Time Analytics"
              description="Monitor patient consultations, track health trends, and get actionable insights instantly"
              gradient="from-orange-500 to-red-500"
              delay={0.4}
            />
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8" />}
              title="Seamless Communication"
              description="Direct messaging between patients and doctors with AI assistance for faster responses"
              gradient="from-indigo-500 to-blue-500"
              delay={0.5}
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8" />}
              title="Surge Prediction"
              description="AI-powered forecasting helps hospitals prepare for patient volume surges and optimize resources"
              gradient="from-teal-500 to-green-500"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">AURA</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and intelligent healthcare management
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                number="01"
                title="Sign Up & Connect"
                description="Create your account in seconds. Patients, doctors, and hospital staff can all get started immediately."
                icon={<User className="h-6 w-6" />}
                delay={0.1}
              />
              <StepCard
                number="02"
                title="AI Consultation"
                description="Patients describe symptoms to our AI assistant, which provides preliminary analysis and risk assessment."
                icon={<Brain className="h-6 w-6" />}
                delay={0.2}
              />
              <StepCard
                number="03"
                title="Doctor Review"
                description="Licensed doctors review AI findings, verify diagnoses, and issue prescriptions with full transparency."
                icon={<Stethoscope className="h-6 w-6" />}
                delay={0.3}
              />
            </div>
            </div>
          </div>
        </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                About <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">AURA</span>
              </h2>
            </div>

            <div className="space-y-8 text-lg leading-relaxed text-muted-foreground">
              <div>
                <p className="mb-4">
                  AURA (Autonomous Unified Record Assistant) is a smart AI system that connects people and hospitals through one simple platform. It helps patients keep track of their medical records, chat about symptoms, get basic diagnoses, and even schedule in-person appointments when needed. Through the chat, patients can also be diagnosed and treated under a doctor's supervision, reducing unnecessary hospital visits and saving time for both patients and doctors.
                </p>
              </div>

              <div>
                <p className="mb-4">
                  For hospitals, AURA provides a clear and easy-to-use dashboard that brings together all patient data in one place. It scans and organizes medical records automatically, so a patient's full history is always visible, solving one of the biggest issues in healthcare today: missing or scattered medical information. Along with this, AURA also analyzes trends and external factors like pollution, weather, and events to predict incoming surges in patient visits and alert patients beforehand to prevent sudden sickness. All this better helps hospitals plan, manage staff and resources, stay prepared before demand peaks and better meet demand.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">
                  How does this project fit within the track?
                </h3>
                <p>
                  AURA fits the Healthtech track because it uses AI to make healthcare smarter, faster, and more connected. It helps patients organize their medical history, talk about their symptoms, and get quick guidance without always needing to visit a hospital. At the same time, it makes doctors' lives easier by giving them structured patient data, helping them diagnose faster, and reducing unnecessary consultations. The system can also help hospitals spot early patterns in patient symptoms and prepare better for upcoming health surges. In short, AURA brings agentic AI into healthcare by turning data, conversations, and doctor coordination into a single intelligent workflow that improves both access and efficiency.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Healthcare Delivery?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join thousands of patients, doctors, and hospitals using AURA to deliver better care
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-lg px-10 py-6 h-auto shadow-xl hover:shadow-2xl transition-all">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
            <span className="font-bold text-lg">AURA</span>
                <p className="text-xs text-muted-foreground">Autonomous Unified Record Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a 
                href="#features" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="hover:text-primary transition-colors"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="hover:text-primary transition-colors"
              >
                How It Works
              </a>
              <a 
                href="#about" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="hover:text-primary transition-colors"
              >
                About
              </a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 AURA Healthtech. All rights reserved.
          </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PortalCard({ 
  href, 
  icon, 
  title, 
  description, 
  gradient, 
  delay 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  gradient: string; 
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link href={href}>
        <Card className="group h-full cursor-pointer transition-all hover:shadow-2xl hover:scale-105 border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-xl mb-2">{title}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </motion.div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  gradient, 
  delay 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  gradient: string; 
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="h-full group hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <CardTitle className="text-xl mb-2">{title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

function StepCard({ 
  number, 
  title, 
  description, 
  icon, 
  delay 
}: { 
  number: string; 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative"
    >
      <Card className="h-full text-center border-2 hover:border-primary/50 transition-all bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg">
        {icon}
      </div>
            </div>
          </div>
          <div className="text-4xl font-bold text-muted-foreground/20 mb-2">{number}</div>
          <CardTitle className="text-xl mb-2">{title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
        {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

