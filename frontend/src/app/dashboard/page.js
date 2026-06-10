"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { FlameIcon } from "@/components/StreakCalendar";

function PatientDashboard() {
    const { plan, physio, physioLoading, loading, error, fetchMyPlan, fetchMyPhysio, disconnectPhysio } = usePatient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPhysioModal, setShowPhysioModal] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [disconnectLoading, setDisconnectLoading] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();
    const [doneToday, setDoneToday] = useState(false);
    const [streak, setStreak] = useState(null);
    const [summary, setSummary] = useState(null);
    const [apiKey, setApiKey] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchMyPlan();
        fetchMyPhysio();
    }, [fetchMyPlan, fetchMyPhysio]);

    useEffect(() => {
        if (user) {
            Promise.all([
                api.progress.getSessionsByPatient(user.user_id),
                api.streaks.getMine().catch(() => null),
                api.progress.getMeSummary().catch(() => null),
                api.auth.getApiKey().catch(() => null)
            ]).then(([sessions, streakData, summaryData, keyData]) => {
                setStreak(streakData);
                setSummary(summaryData);
                if (keyData && keyData.api_key) {
                    setApiKey(keyData.api_key);
                }
                if (sessions && sessions.length > 0) {
                    const latest = sessions[0];
                    if (latest.created_at) {
                        const latestDate = new Date(latest.created_at).toDateString();
                        const todayDate = new Date().toDateString();
                        if (latestDate === todayDate) {
                            setDoneToday(true);
                        }
                    }
                }
            }).catch(e => console.error(e));
        }
    }, [user]);

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
            {error && <div className="error-box">⚠️ {error}</div>}
            {streak && (
                <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-panel to-emerald-500/10 text-left">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                            <FlameIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-muted font-bold">Aktualna passa</div>
                            <div className="text-3xl font-black text-amber-300">{streak.current_streak} dni</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <span className="badge-success">Rekord: {streak.longest_streak} dni</span>
                        <span className={streak.completed_today ? "badge-success" : "badge-warning"}>
                            {streak.completed_today ? "Dzisiaj wykonane" : "Do zrobienia dzisiaj"}
                        </span>
                    </div>
                </div>
            )}
            
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                    <div className="card-hover p-5 flex flex-col justify-between border border-outline/50 bg-panel/50 backdrop-blur-sm gap-3">
                        <div className="flex justify-between items-start">
                            <div className="text-sm font-semibold text-muted">{t('dashboard.patient.precision') || 'Precyzja'}</div>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white">
                                {summary.overall_avg_accuracy ? `${summary.overall_avg_accuracy}%` : '-'}
                            </div>
                            <div className="text-xs text-emerald-400 font-medium mt-1">
                                {t('dashboard.patient.overallAccuracy') || 'Ogólna poprawność'}
                            </div>
                        </div>
                    </div>

                    <div className="card-hover p-5 flex flex-col justify-between border border-outline/50 bg-panel/50 backdrop-blur-sm gap-3">
                        <div className="flex justify-between items-start">
                            <div className="text-sm font-semibold text-muted">{t('dashboard.patient.sessions') || 'Sesje'}</div>
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white">
                                {summary.total_sessions || 0}
                            </div>
                            <div className="text-xs text-blue-400 font-medium mt-1">
                                {t('dashboard.patient.totalSessions') || 'Odbytych sesji'}
                            </div>
                        </div>
                    </div>

                    <div className="card-hover p-5 flex flex-col justify-between border border-outline/50 bg-panel/50 backdrop-blur-sm gap-3">
                        <div className="flex justify-between items-start">
                            <div className="text-sm font-semibold text-muted">{t('dashboard.patient.activity') || 'Aktywność'}</div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : summary.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                        <div>
                            <div className="text-lg font-black text-white">
                                {summary.status === 'ok' ? (t('dashboard.patient.statusGood') || 'W formie') : summary.status === 'warning' ? (t('dashboard.patient.statusWarning') || 'Wymaga uwagi') : (t('dashboard.patient.statusCritical') || 'Brak aktywności')}
                            </div>
                            <div className="text-xs text-muted font-medium mt-1">
                                {summary.days_since_activity !== null ? `${t('dashboard.patient.lastWorkout') || 'Ostatni:'} ${summary.days_since_activity} dni temu` : (t('dashboard.patient.noData') || 'Brak danych')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BADGES PANEL */}
            {summary && (
                <div className="card p-6 flex flex-col gap-4 border border-outline/50 bg-panel/50 backdrop-blur-sm mb-2">
                    <div>
                        <h3 className="font-bold text-lg text-white">{t('dashboard.patient.badgesTitle') || 'Twoje Odznaki'}</h3>
                        <p className="text-xs text-muted">{t('dashboard.patient.badgesDesc') || 'Zdobywaj osiągnięcia za regularność i precyzję'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { id: 'FIRST_SESSION', icon: '🎯', gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/20' },
                            { id: 'STREAK_3', icon: '🔥', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/20' },
                            { id: 'STREAK_7', icon: '⚡', gradient: 'from-amber-400 to-yellow-500', bg: 'bg-amber-500/20' },
                            { id: 'SESSIONS_10', icon: '🏆', gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/20' },
                            { id: 'ACCURACY_90', icon: '⭐', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/20' }
                        ].map(badge => {
                            const earned = summary.badges?.includes(badge.id);
                            return (
                                <div key={badge.id} className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${earned ? 'border-outline bg-main/50' : 'border-dashed border-outline/30 bg-transparent opacity-50 grayscale'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${earned ? `bg-gradient-to-br ${badge.gradient} shadow-lg shadow-${badge.gradient.split('-')[1]}/20` : 'bg-surface'}`}>
                                        {badge.icon}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-white leading-tight mb-0.5">{t(`badge.${badge.id}.title`) || badge.id}</div>
                                        <div className="text-[10px] text-muted leading-tight">{t(`badge.${badge.id}.desc`) || 'Odznaka'}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                    onClick={() => router.push("/dashboard/plan")}
                    className="card-hover p-6 flex flex-col gap-3 cursor-pointer group relative"
                    role="button"
                    tabIndex={0}
                >
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        {plan && plan.exercises && plan.exercises.length > 0 && !doneToday && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push("/dashboard/session");
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-emerald-500/30 hover:scale-105 transition-all z-10"
                            >
                                {t('dashboard.patient.notification')}
                            </button>
                        )}
                    </div>
                    <span className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">{t('dashboard.patient.myPlan')}</span>
                    <span className="text-xs text-muted">
                        {plan ? `${t('dashboard.patient.activePlan')} ${plan.title}` : loading ? t('dashboard.patient.loading') : t('dashboard.patient.noPlan')}
                    </span>
                </div>

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
                    <div
                        className="card-hover p-6 flex flex-col gap-3 group cursor-pointer"
                        onClick={() => setShowPhysioModal(true)}
                    >
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

            {/* INTEGRATION PANEL */}
            <div className="card border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-panel to-blue-500/10 p-6 flex flex-col gap-4 mt-2 mb-8 text-left">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">{t('dashboard.patient.integrationTitle') || 'Integracje (Zewnętrzne API)'}</h3>
                        <p className="text-xs text-muted">{t('dashboard.patient.integrationDesc') || 'Wygeneruj klucz (X-API-Key) aby połączyć swój panel statystyk z widgetami w telefonie lub aplikacjami zewnętrznymi.'}</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end w-full">
                    {apiKey ? (
                        <div className="flex-1 w-full flex flex-col gap-1">
                            <label className="text-xs font-mono text-muted uppercase tracking-wider">{t('dashboard.patient.yourApiKey') || 'Twój klucz API:'}</label>
                            <div className="flex w-full bg-main/50 border border-outline rounded-xl overflow-hidden shadow-inner">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={apiKey} 
                                    className="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-indigo-200 outline-none w-full min-w-0"
                                />
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(apiKey);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className={`px-4 py-3 text-sm font-bold transition-colors border-l border-outline flex items-center gap-2 shrink-0 ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-panel hover:bg-white/5 text-white'}`}
                                >
                                    {copied ? (
                                        <>{t('dashboard.patient.keyCopied') || 'Skopiowano!'}</>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            {t('dashboard.patient.copyKey') || 'Skopiuj'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 w-full text-sm text-amber-400/80 bg-amber-500/10 px-4 py-3 rounded-xl border border-amber-500/20 flex items-center">
                            {t('dashboard.patient.noApiKey') || 'Nie masz jeszcze wygenerowanego klucza dostępu.'}
                        </div>
                    )}
                    <button 
                        onClick={async () => {
                            try {
                                const res = await api.auth.generateApiKey();
                                setApiKey(res.api_key);
                            } catch(e) {
                                console.error(e);
                            }
                        }}
                        className="px-6 py-3 font-bold rounded-xl whitespace-nowrap bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors shrink-0"
                    >
                        {apiKey ? (t('dashboard.patient.reGenerateKey') || 'Wygeneruj Nowy') : (t('dashboard.patient.generateKey') || 'Wygeneruj Klucz')}
                    </button>
                </div>
            </div>

            {showPhysioModal && physio && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowPhysioModal(false)}>
                    <div className="bg-panel border border-outline/50 rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
                            onClick={() => setShowPhysioModal(false)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col items-center gap-3 mt-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                <span className="text-2xl font-bold text-violet-400">
                                    {physio.first_name[0]}{physio.last_name[0]}
                                </span>
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-xl text-white">{physio.first_name} {physio.last_name}</h3>
                                <p className="text-sm text-muted">{physio.email}</p>
                            </div>

                            <span className={`text-xs font-mono px-3 py-1.5 rounded-full mt-2 ${physio.status === "ZAAKCEPTOWANE"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}>
                                {physio.status === "ZAAKCEPTOWANE" ? t('dashboard.patient.connected') : t('dashboard.patient.pending')}
                            </span>
                        </div>

                        <div className="w-full flex flex-col gap-2 mt-4 bg-background/50 rounded-xl p-4 border border-outline/30">
                            {physio.specialization && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">{t('dashboard.findPhysio.specialization') || 'Specialization'}</span>
                                    <span className="text-white font-medium">{physio.specialization}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">{t('dashboard.findPhysio.patientsCount') || 'Patients'}</span>
                                <span className="text-white font-medium">{physio.patient_count ?? 0}</span>
                            </div>
                            {physio.certificates && physio.certificates.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-outline/30">
                                    <span className="text-xs text-muted block mb-2">{t('dashboard.findPhysio.certificates') || 'Certificates'}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {physio.certificates.map(cert => (
                                            <button 
                                                key={cert.certificate_id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCertificate(cert.file_url);
                                                }}
                                                className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                                {cert.is_verified && (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                                {cert.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-outline/30 flex justify-center">
                            <button
                                onClick={() => {
                                    setShowPhysioModal(false);
                                    setShowDisconnectConfirm(true);
                                }}
                                className="btn flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                </svg>
                                {t('dashboard.patient.disconnect')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disconnect Confirm Modal */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !disconnectLoading && setShowDisconnectConfirm(false)}>
                    <div className="bg-panel border border-outline/50 rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl text-white">{t('dashboard.patient.disconnectConfirmTitle')}</h3>
                        <p className="text-sm text-muted">{t('dashboard.patient.disconnectConfirmDesc')}</p>
                        <div className="flex flex-col gap-2 mt-2">
                            <button
                                onClick={async () => {
                                    setDisconnectLoading(true);
                                    try {
                                        await disconnectPhysio();
                                        setShowDisconnectConfirm(false);
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        setDisconnectLoading(false);
                                    }
                                }}
                                disabled={disconnectLoading}
                                className="btn-primary bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-red-500/30 border-none"
                            >
                                {disconnectLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4 spinner" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    </span>
                                ) : (
                                    t('dashboard.patient.disconnect')
                                )}
                            </button>
                            <button
                                onClick={() => setShowDisconnectConfirm(false)}
                                disabled={disconnectLoading}
                                className="btn"
                            >
                                {t('dashboard.findPhysio.confirmNo') || 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Certificate Viewer Modal */}
            {selectedCertificate && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCertificate(null)}>
                    <div className="relative bg-panel border border-outline/50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-outline/50">
                            <h3 className="font-semibold text-lg text-white">{t('dashboard.certificates.preview') || 'Certificate Preview'}</h3>
                            <button onClick={() => setSelectedCertificate(null)} className="text-muted hover:text-white p-1 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-hidden flex items-center justify-center min-h-[50vh]">
                            {selectedCertificate.toLowerCase().endsWith('.pdf') || selectedCertificate.includes('/raw/') ? (
                                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedCertificate)}&embedded=true`} className="w-full h-[70vh] rounded-lg bg-white" title="Certificate PDF preview" />
                            ) : (
                                <img src={selectedCertificate} alt="Certificate preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                            )}
                        </div>
                    </div>
                </div>
            )}
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
