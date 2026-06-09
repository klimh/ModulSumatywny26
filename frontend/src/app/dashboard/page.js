"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

function PatientDashboard() {
    const { plan, physio, physioLoading, loading, error, fetchMyPlan, fetchMyPhysio } = usePatient();
    const [unreadCount, setUnreadCount] = useState(0);
    const { t } = useTranslation();

    useEffect(() => {
        fetchMyPlan();
        fetchMyPhysio();
    }, [fetchMyPlan, fetchMyPhysio]);

    useEffect(() => {
        let interval;
        const fetchUnread = async () => {
            try {
                const res = await api.chat.getUnreadCount();
                setUnreadCount(res.unread_count || 0);
            } catch (e) { }
        };
        fetchUnread();
        interval = setInterval(fetchUnread, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
            <h2 className="section-title">{t('dashboard.patient.title')}</h2>
            {error && <div className="error-box">⚠️ {error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/dashboard/plan" className="card-hover p-6 flex flex-col gap-3 no-underline group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">{t('dashboard.patient.myPlan')}</span>
                    <span className="text-xs text-muted">
                        {plan ? `${t('dashboard.patient.activePlan')} ${plan.title}` : loading ? t('dashboard.patient.loading') : t('dashboard.patient.noPlan')}
                    </span>
                </Link>

                <Link href="/dashboard/chat" className="relative card-hover p-6 flex flex-col gap-3 no-underline group">
                    {unreadCount > 0 && (
                        <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg group-hover:text-pink-400 transition-colors">{t('dashboard.patient.chat')}</span>
                    <span className="text-xs text-muted">
                        {t('dashboard.patient.chatDesc')}
                    </span>
                </Link>

                <Link href="/dashboard/progress" className="card-hover p-6 flex flex-col gap-3 no-underline group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg group-hover:text-orange-400 transition-colors">{t('dashboard.patient.progress')}</span>
                    <span className="text-xs text-muted">
                        {t('dashboard.patient.progressDesc')}
                    </span>
                </Link>


                {physioLoading ? (
                    <div className="card-hover p-6 flex flex-col gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-violet-400 spinner" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-lg">{t('dashboard.patient.loading')}</span>
                    </div>
                ) : physio ? (
                    <div className="card-hover p-6 flex flex-col gap-3 group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-lg group-hover:text-violet-400 transition-colors">{t('dashboard.patient.myPhysio')}</span>
                        <span className="text-sm font-medium">{physio.first_name} {physio.last_name}</span>
                        <span className="text-xs text-muted">{physio.email}</span>
                        <span className={`text-xs font-mono px-2 py-1 rounded-full w-fit ${physio.status === "ZAAKCEPTOWANE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                            }`}>
                            {physio.status === "ZAAKCEPTOWANE" ? t('dashboard.patient.connected') : t('dashboard.patient.pending')}
                        </span>
                    </div>
                ) : (
                    <Link href="/dashboard/find-physio" className="card-hover p-6 flex flex-col gap-3 no-underline group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-lg group-hover:text-violet-400 transition-colors">{t('dashboard.patient.findPhysio')}</span>
                        <span className="text-xs text-muted">
                            {t('dashboard.patient.findPhysioDesc')}
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
}

function PhysioDashboard() {
    const { patients, requests, exercises, loading, error, fetchMyPatients, fetchRequests, fetchExercises } = usePhysio();
    const [unreadCount, setUnreadCount] = useState(0);
    const { t } = useTranslation();

    useEffect(() => {
        fetchMyPatients();
        fetchRequests();
        fetchExercises();
    }, [fetchMyPatients, fetchRequests, fetchExercises]);

    useEffect(() => {
        let interval;
        const fetchUnread = async () => {
            try {
                const res = await api.chat.getUnreadCount();
                setUnreadCount(res.unread_count || 0);
            } catch (e) { }
        };
        fetchUnread();
        interval = setInterval(fetchUnread, 5000);
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        {
            label: t('dashboard.physio.patients'),
            value: patients.length,
            href: "/dashboard/patients",
            gradient: "from-emerald-500/20 to-teal-500/20",
            textColor: "text-emerald-400",
            data: patients,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: t('dashboard.physio.requests'),
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
            label: t('dashboard.physio.exercises'),
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
        {
            label: t('header.certificates'),
            value: "📄",
            href: "/dashboard/certificates",
            gradient: "from-cyan-500/20 to-blue-500/20",
            textColor: "text-cyan-400",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            id: "chat",
            label: t('dashboard.physio.chat'),
            value: "💬",
            href: "/dashboard/chat",
            gradient: "from-blue-500/20 to-indigo-500/20",
            textColor: "text-blue-400",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="w-full max-w-5xl flex flex-col gap-4 animate-fade-in mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4">
                {statCards.map((card, index) => {
                    const isFirst = index === 0;
                    return (
                        <Link
                            key={card.href}
                            href={card.href}
                            className={`relative card-hover flex flex-col no-underline group border border-outline/50 hover:border-outline bg-panel/50 backdrop-blur-sm min-h-[160px] ${isFirst ? 'md:col-span-2 md:row-span-2 justify-between p-6' : 'md:col-span-1 md:row-span-1 justify-center p-5 gap-4'}`}
                        >
                            {card.id === "chat" && unreadCount > 0 && (
                                <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            )}

                            {isFirst ? (
                                <div className="flex flex-col h-full justify-between gap-8">
                                    <div className="flex items-start justify-between w-full">
                                        <div className="flex items-center gap-5">
                                            <div className={`rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center ${card.textColor} shadow-lg group-hover:scale-110 transition-transform duration-300 w-16 h-16 shrink-0`}>
                                                <div className="scale-125">{card.icon}</div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-bold text-white tracking-wide">{card.label}</span>
                                                <span className="text-sm font-medium text-emerald-400/80 mt-1">{t('dashboard.physio.manageProgress')}</span>
                                            </div>
                                        </div>
                                        <span className={`font-black ${card.textColor} drop-shadow-md text-6xl`}>
                                            {card.value}
                                        </span>
                                    </div>

                                    {card.data && card.data.length > 0 && (
                                        <div className="flex flex-col gap-3 mt-auto">
                                            <span className="text-xs uppercase tracking-widest font-bold text-muted/70">{t('dashboard.physio.activePatients')}</span>
                                            <div className="flex flex-wrap gap-3">
                                                {card.data.slice(0, 5).map(p => (
                                                    <div key={p.user_id} className="bg-main border border-outline px-4 py-2 rounded-xl text-sm font-medium text-primary flex items-center gap-2.5 shadow-sm hover:border-emerald-500/30 transition-colors">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                                        {p.first_name} {p.last_name}
                                                    </div>
                                                ))}
                                                {card.data.length > 5 && (
                                                    <div className="bg-main/50 border border-outline/50 px-4 py-2 rounded-xl text-sm font-medium text-muted">
                                                        +{card.data.length - 5} {t('dashboard.physio.more')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between flex-col sm:flex-row md:flex-col lg:flex-row gap-2">
                                        <div className={`rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center ${card.textColor} shadow-lg group-hover:scale-110 transition-transform duration-300 w-10 h-10`}>
                                            <div className="scale-75">{card.icon}</div>
                                        </div>
                                        <span className={`font-black ${card.textColor} drop-shadow-md text-3xl`}>
                                            {card.id === "chat" ? card.value : loading ? "…" : card.value}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-muted group-hover:text-white transition-colors text-sm">{card.label}</span>
                                </>
                            )}
                        </Link>
                    )
                })}
            </div>

            {error && <div className="error-box">⚠️ {error}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
        if (!loading && user && user.role === "admin") {
            router.push("/dashboard/admin");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user || user.role === "admin") return null;

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">
                    {user.role === "fizjoterapeuta" ? t('dashboard.main.physioTitle') : t('dashboard.main.patientTitle')}
                </h1>
                <p className="text-sm text-muted font-mono">
                    {t('dashboard.main.welcome')} {user.first_name} {user.last_name}
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
