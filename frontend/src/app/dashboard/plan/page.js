"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlanPage() {
    const { user, loading: authLoading } = useAuth();
    const { plan, loading, error, fetchMyPlan } = usePatient();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) fetchMyPlan();
    }, [user, fetchMyPlan]);

    if (authLoading || loading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title text-3xl md:text-4xl">My Rehabilitation Plan</h1>
                <p className="text-sm text-muted">Your personalized exercise program</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in">
                {error && <div className="error-box mb-4">⚠️ {error}</div>}

                {plan ? (
                    <div className="card p-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="section-title">{plan.title}</h2>
                                <span className="text-xs text-muted font-mono">
                                    Plan ID: {plan.rehab_id}
                                </span>
                            </div>
                            <span className="badge-success">Active</span>
                        </div>

                        {plan.exercises && plan.exercises.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
                                    Exercises
                                </h3>
                                {plan.exercises.map((ex, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-4 rounded-xl bg-main border border-outline"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium">{ex.name || `Exercise ${ex.exercise_id}`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="badge-info">{ex.reps_nr} reps</span>
                                            <span className="badge-warning">{ex.sets_nr} sets</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted text-center py-4">
                                No exercises assigned to this plan yet.
                            </p>
                        )}

                        <Link href="/pose" className="btn-primary text-center no-underline w-fit self-center">
                            Start Exercise Session
                        </Link>
                    </div>
                ) : (
                    <div className="card p-12 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">No Active Plan</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            Your physiotherapist has not assigned a rehabilitation plan yet. Please contact your physiotherapist or wait for a plan to be created.
                        </p>
                    </div>
                )}
            </div>
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
