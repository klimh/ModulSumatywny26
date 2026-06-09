"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

export default function PatientsPage() {
    const { user, loading: authLoading } = useAuth();
    const { patients, loading, error, fetchMyPatients } = usePhysio();
    const router = useRouter();
    const { t } = useTranslation();
    const [summaries, setSummaries] = useState({});
    const [summariesLoading, setSummariesLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "fizjoterapeuta") fetchMyPatients();
    }, [user, fetchMyPatients]);

    useEffect(() => {
        const fetchSummaries = async () => {
            if (!patients || patients.length === 0) return;
            setSummariesLoading(true);
            const newSummaries = {};
            await Promise.all(
                patients.map(async (patient) => {
                    try {
                        const summary = await api.progress.getSummary(patient.user_id);
                        newSummaries[patient.user_id] = summary;
                    } catch {
                        newSummaries[patient.user_id] = null;
                    }
                })
            );
            setSummaries(newSummaries);
            setSummariesLoading(false);
        };
        fetchSummaries();
    }, [patients]);

    const getStatusBadge = (patientId) => {
        const summary = summaries[patientId];
        if (!summary) {
            if (summariesLoading) return <span className="badge bg-white/10 text-muted">…</span>;
            return null;
        }

        switch (summary.status) {
            case "green":
                return (
                    <span className="badge-success flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                        {t('dashboard.patients.makingProgress')}
                    </span>
                );
            case "red":
                return (
                    <span className="badge-danger flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]"></span>
                        {summary.days_since_activity != null && summary.days_since_activity > 3
                            ? t('dashboard.patients.inactive').replace('{days}', summary.days_since_activity)
                            : t('dashboard.patients.needsAttention')}
                    </span>
                );
            case "yellow":
                return (
                    <span className="badge-warning flex items-center gap-1.5">
                        {t('dashboard.patients.noPlan')}
                    </span>
                );
            default:
                return null;
        }
    };

    const getStatusSortOrder = (patientId) => {
        const summary = summaries[patientId];
        if (!summary) return 3;
        if (summary.status === "red") return 0;
        if (summary.status === "yellow") return 1;
        return 2;
    };

    const sortedPatients = [...patients].sort((a, b) => {
        return getStatusSortOrder(a.user_id) - getStatusSortOrder(b.user_id);
    });

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
                <h1 className="page-title text-3xl md:text-4xl">{t('dashboard.patients.title')}</h1>
                <p className="text-sm text-muted">{t('dashboard.patients.desc')}</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in">
                {error && <div className="error-box mb-4">{error}</div>}

                {/* Status Legend */}
                {patients.length > 0 && Object.keys(summaries).length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-6 p-4 card">
                        <span className="text-xs text-muted font-semibold uppercase tracking-wider">{t('dashboard.patients.legend')}:</span>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                            <span className="text-muted">{t('dashboard.patients.makingProgress')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]"></span>
                            <span className="text-muted">{t('dashboard.patients.needsAttention')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted">{t('dashboard.patients.noPlan')}</span>
                        </div>
                    </div>
                )}

                {sortedPatients.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {sortedPatients.map((patient) => {
                            const summary = summaries[patient.user_id];
                            return (
                                <Link
                                    key={patient.user_id}
                                    href={`/dashboard/patients/${patient.user_id}`}
                                    className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                                            <span className="text-white font-bold text-sm">
                                                {patient.first_name?.[0]?.toUpperCase()}{patient.last_name?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-lg">
                                            {patient.first_name} {patient.last_name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(patient.user_id)}
                                        <svg className="w-5 h-5 text-muted group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="card p-12 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">{t('dashboard.patients.noPatients')}</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            {t('dashboard.patients.noPatientsDesc')}
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
