"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";

function PatientDashboard() {
    const { plan, loading, error, fetchMyPlan } = usePatient();

    useEffect(() => {
        fetchMyPlan();
    }, [fetchMyPlan]);

    return (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
            <h2 className="section-title">My Rehabilitation</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/dashboard/plan" className="card-hover p-6 flex flex-col gap-3 no-underline group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">My Plan</span>
                    <span className="text-xs text-muted">
                        {plan ? `Active: ${plan.title}` : loading ? "Loading…" : "No active plan"}
                    </span>
                </Link>

                <Link href="/pose" className="card-hover p-6 flex flex-col gap-3 no-underline group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg group-hover:text-cyan-400 transition-colors">Pose Analysis</span>
                    <span className="text-xs text-muted">
                        Real-time body pose detection and exercise tracking
                    </span>
                </Link>
            </div>

            {error && <div className="error-box">⚠️ {error}</div>}
        </div>
    );
}

function PhysioDashboard() {
    const { patients, requests, exercises, loading, error, fetchMyPatients, fetchRequests, fetchExercises } = usePhysio();

    useEffect(() => {
        fetchMyPatients();
        fetchRequests();
        fetchExercises();
    }, [fetchMyPatients, fetchRequests, fetchExercises]);

    const statCards = [
        {
            label: "Patients",
            value: patients.length,
            href: "/dashboard/patients",
            gradient: "from-emerald-500/20 to-teal-500/20",
            textColor: "text-emerald-400",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: "Pending Requests",
            value: requests.length,
            href: "/dashboard/requests",
            gradient: "from-amber-500/20 to-orange-500/20",
            textColor: "text-amber-400",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
        },
        {
            label: "Exercises",
            value: exercises.length,
            href: "/dashboard/exercises",
            gradient: "from-fuchsia-500/20 to-purple-500/20",
            textColor: "text-fuchsia-400",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
            <h2 className="section-title">Physiotherapist Panel</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statCards.map((card) => (
                    <Link key={card.href} href={card.href} className="card-hover p-6 flex flex-col gap-3 no-underline group">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center ${card.textColor}`}>
                            {card.icon}
                        </div>
                        <span className={`text-3xl font-black ${card.textColor}`}>{loading ? "…" : card.value}</span>
                        <span className="text-sm font-medium text-muted group-hover:text-primary transition-colors">{card.label}</span>
                    </Link>
                ))}
            </div>

            <Link href="/dashboard/create-plan" className="btn-primary text-center no-underline w-fit self-start">
                + Create Rehabilitation Plan
            </Link>

            {error && <div className="error-box">⚠️ {error}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">
                    {user.role === "fizjoterapeuta" ? "Physio Dashboard" : "Patient Dashboard"}
                </h1>
                <p className="text-sm text-muted font-mono">
                    Welcome back, {user.first_name} {user.last_name}
                </p>
            </div>

            {user.role === "fizjoterapeuta" ? <PhysioDashboard /> : <PatientDashboard />}
        </div>
    );
}

function Spinner({ size = "sm" }) {
    const dim = size === "lg" ? "w-8 h-8" : "w-4 h-4";
    return (
        <svg className={`${dim} spinner`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}
