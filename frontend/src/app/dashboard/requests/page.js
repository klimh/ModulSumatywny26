"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function RequestsPage() {
    const { user, loading: authLoading } = useAuth();
    const { requests, loading, error, fetchRequests, respondToRequest } = usePhysio();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "fizjoterapeuta") fetchRequests();
    }, [user, fetchRequests]);

    const handleRespond = async (requestId, accept) => {
        try {
            await respondToRequest(requestId, accept);
        } catch (err) {
            // Error is already set in the hook
        }
    };

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
                <h1 className="page-title text-3xl md:text-4xl">{t('dashboard.requests.title')}</h1>
                <p className="text-sm text-muted">{t('dashboard.requests.desc')}</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in">
                {error && <div className="error-box mb-4">⚠️ {error}</div>}

                {requests.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className="card p-5 flex items-center justify-between gap-4 flex-wrap"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {req.patient_name}
                                        </span>
                                        <span className="badge-warning w-fit mt-1">{t('dashboard.requests.pending')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRespond(req.id, true)}
                                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all duration-300 cursor-pointer"
                                    >
                                        {t('dashboard.requests.accept')}
                                    </button>
                                    <button
                                        onClick={() => handleRespond(req.id, false)}
                                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all duration-300 cursor-pointer"
                                    >
                                        {t('dashboard.requests.decline')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card p-12 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">{t('dashboard.requests.emptyTitle')}</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            {t('dashboard.requests.emptyDesc')}
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
