"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PatientsPage() {
    const { user, loading: authLoading } = useAuth();
    const { patients, loading, error, fetchMyPatients } = usePhysio();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "fizjoterapeuta") fetchMyPatients();
    }, [user, fetchMyPatients]);

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
                <h1 className="page-title text-3xl md:text-4xl">My Patients</h1>
                <p className="text-sm text-muted">Patients currently assigned to you</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in">
                {error && <div className="error-box mb-4">⚠️ {error}</div>}

                {patients.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {patients.map((patient) => (
                            <div
                                key={patient.user_id}
                                className="card p-5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                        <span className="text-white font-bold text-sm">
                                            {patient.first_name?.[0]?.toUpperCase()}{patient.last_name?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {patient.first_name} {patient.last_name}
                                        </span>
                                        <span className="text-xs text-muted">{patient.email}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/dashboard/create-plan?patient_id=${patient.user_id}`}
                                        className="btn-ghost text-teal-400 hover:bg-teal-500/10 text-xs py-2 px-3"
                                    >
                                        Assign Plan
                                    </Link>
                                    <span className="badge-success">Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card p-12 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">No Patients Yet</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            You don&apos;t have any accepted patients. Check the Requests page for pending requests.
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
