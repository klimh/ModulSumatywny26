"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

export default function PatientProgressPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [notes, setNotes] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exerciseFilter, setExerciseFilter] = useState("");

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "pacjent")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const [notesData, sessionsData, historyData] = await Promise.all([
                    api.progress.getNotesByPatient(user.user_id),
                    api.progress.getSessionsByPatient(user.user_id),
                    api.progress.getHistory(user.user_id)
                ]);
                setNotes(notesData);
                setSessions(sessionsData);
                setHistory(historyData);
            } catch (err) {
                setError(err.message || "Failed to load progress data");
            } finally {
                setLoading(false);
            }
        };

        if (user && user.role === "pacjent") {
            fetchProgress();
        }
    }, [user]);

    const exercises = useMemo(() => {
        const map = new Map();
        history.forEach(s => s.results?.forEach(r => {
            if (!map.has(r.exercise_id)) map.set(r.exercise_id, r.exercise_name);
        }));
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [history]);

    const filteredHistory = useMemo(() => {
        if (!exerciseFilter) return history;
        return history.map(s => ({
            ...s,
            results: s.results.filter(r => String(r.exercise_id) === exerciseFilter)
        })).filter(s => s.results.length > 0);
    }, [history, exerciseFilter]);

    const kpis = useMemo(() => {
        if (!sessions || sessions.length === 0) return null;

        const allResults = sessions.flatMap(s => s.results || []);
        const allAccuracies = allResults.filter(r => r.avg_accuracy != null).map(r => r.avg_accuracy);

        const latestSession = sessions[0];
        const latestAccuracies = (latestSession?.results || []).filter(r => r.avg_accuracy != null).map(r => r.avg_accuracy);
        const latestAvg = latestAccuracies.length > 0 ? Math.round(latestAccuracies.reduce((a, b) => a + b, 0) / latestAccuracies.length) : null;

        let prevAvg = null;
        let accuracyDiff = null;
        if (sessions.length >= 2) {
            const prevSession = sessions[1];
            const prevAccuracies = (prevSession?.results || []).filter(r => r.avg_accuracy != null).map(r => r.avg_accuracy);
            prevAvg = prevAccuracies.length > 0 ? Math.round(prevAccuracies.reduce((a, b) => a + b, 0) / prevAccuracies.length) : null;
            if (latestAvg != null && prevAvg != null) {
                accuracyDiff = latestAvg - prevAvg;
            }
        }

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const sessionsThisWeek = sessions.filter(s => s.created_at && new Date(s.created_at) >= weekStart).length;
        const sessionDates = new Set(sessions.filter(s => s.created_at).map(s => new Date(s.created_at).toISOString().split('T')[0]));
        let streak = 0;
        const checkDate = new Date();
        const todayStr = checkDate.toISOString().split('T')[0];
        if (!sessionDates.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        for (let i = 0; i < 365; i++) {
            const ds = checkDate.toISOString().split('T')[0];
            if (sessionDates.has(ds)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return { latestAvg, accuracyDiff, sessionsThisWeek, streak, totalSessions: sessions.length };
    }, [sessions]);

    const chartData = useMemo(() => {
        if (!filteredHistory || filteredHistory.length === 0) return null;

        const labels = filteredHistory.map((s, i) => {
            if (s.created_at) {
                const d = new Date(s.created_at);
                return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
            }
            return `Session ${i + 1}`;
        });

        const data = filteredHistory.map(s => {
            const accs = s.results.filter(r => r.avg_accuracy != null).map(r => r.avg_accuracy);
            return accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
        });

        return {
            labels,
            datasets: [{
                label: `${t('dashboard.progress.accuracy')} (%)`,
                data,
                borderColor: "rgb(52, 211, 153)",
                backgroundColor: "rgba(52, 211, 153, 0.1)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "rgb(52, 211, 153)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }]
        };
    }, [filteredHistory]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0,0,0,0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                padding: 12,
                cornerRadius: 8,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
            }
        },
        scales: {
            x: {
                ticks: { color: "rgba(255,255,255,0.5)", font: { size: 11 } },
                grid: { color: "rgba(255,255,255,0.05)" }
            },
            y: {
                ticks: { color: "rgba(255,255,255,0.5)", font: { size: 11 } },
                grid: { color: "rgba(255,255,255,0.05)" },
                beginAtZero: true,
                max: 100,
            }
        }
    };

    const calendarData = useMemo(() => {
        if (!sessions) return [];
        const sessionDatesMap = {};
        sessions.forEach(s => {
            if (s.created_at) {
                const ds = new Date(s.created_at).toISOString().split('T')[0];
                sessionDatesMap[ds] = (sessionDatesMap[ds] || 0) + 1;
            }
        });

        const weeks = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1 - 77);

        for (let w = 0; w < 12; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const current = new Date(startDate);
                current.setDate(current.getDate() + w * 7 + d);
                const ds = current.toISOString().split('T')[0];
                const isFuture = current > today;

                const weekdayShort = current.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                const localizedWeekday = t(`dashboard.progress.daysOfWeek.${weekdayShort}`);
                const dayMonth = current.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

                week.push({
                    date: ds,
                    count: sessionDatesMap[ds] || 0,
                    isFuture,
                    dayLabel: `${localizedWeekday}, ${dayMonth}`
                });
            }
            weeks.push(week);
        }
        return weeks;
    }, [sessions]);

    const getCalendarColor = (count, isFuture) => {
        if (isFuture) return "bg-white/[0.02]";
        if (count === 0) return "bg-white/[0.06]";
        if (count === 1) return "bg-emerald-500/30";
        if (count === 2) return "bg-emerald-500/50";
        return "bg-emerald-500/80";
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
                <h1 className="page-title text-3xl md:text-4xl">{t('dashboard.progress.title')}</h1>
                <p className="text-sm text-muted">{t('dashboard.progress.subtitle')}</p>
            </div>

            <div className="w-full max-w-5xl animate-fade-in flex flex-col gap-8">
                {error && <div className="error-box">⚠️ {error}</div>}

                {kpis && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-5 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">{t('dashboard.progress.accuracy')}</span>
                            <span className="text-3xl font-black text-emerald-400">
                                {kpis.latestAvg != null ? `${kpis.latestAvg}%` : "—"}
                            </span>
                            {kpis.accuracyDiff != null && (
                                <span className={`text-xs font-semibold ${kpis.accuracyDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {kpis.accuracyDiff >= 0 ? "▲" : "▼"} {Math.abs(kpis.accuracyDiff)}% {t('dashboard.progress.vsPrevious')}
                                </span>
                            )}
                        </div>

                        <div className="card p-5 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">{t('dashboard.progress.sessionsThisWeek')}</span>
                            <span className="text-3xl font-black text-blue-400">{kpis.sessionsThisWeek}</span>
                            <span className="text-xs text-muted">{t('dashboard.progress.outOfTotal').replace('{total}', kpis.totalSessions)}</span>
                        </div>

                        <div className="card p-5 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">{t('dashboard.progress.trainingStreak')}</span>
                            <span className="text-3xl font-black text-amber-400">{kpis.streak} {kpis.streak === 1 ? t('dashboard.progress.day') : t('dashboard.progress.days')}</span>
                            <span className="text-xs text-muted">
                                {kpis.streak >= 7 ? t('dashboard.progress.streakGreat') : kpis.streak >= 3 ? t('dashboard.progress.streakKeepItUp') : t('dashboard.progress.streakStart')}
                            </span>
                        </div>

                        <div className="card p-5 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">{t('dashboard.progress.totalSessions')}</span>
                            <span className="text-3xl font-black text-violet-400">{kpis.totalSessions}</span>
                            <span className="text-xs text-muted">{t('dashboard.progress.allCompletedWorkouts')}</span>
                        </div>
                    </div>
                )}

                {history.length > 0 && (
                    <section className="card p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold">{t('dashboard.progress.progressChart')}</h2>
                            <div className="flex gap-2 flex-wrap">
                                {exercises.length > 0 && (
                                    <select
                                        value={exerciseFilter}
                                        onChange={e => setExerciseFilter(e.target.value)}
                                        className="input-field w-auto text-xs !py-1.5 !px-3 !rounded-lg"
                                    >
                                        <option value="">{t('dashboard.progress.allExercises')}</option>
                                        {exercises.map(ex => (
                                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="h-[300px]">
                            {chartData ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted text-sm">
                                    {t('dashboard.progress.noData')}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {calendarData.length > 0 && (
                    <section className="card p-6">
                        <h2 className="text-xl font-bold mb-4">{t('dashboard.progress.activityCalendar')}</h2>
                        <div className="flex gap-3 mb-2">
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.mon')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.tue')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.wed')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.thu')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.fri')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.sat')}</span>
                            <span className="text-xs text-muted w-8">{t('dashboard.progress.daysOfWeek.sun')}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            {calendarData.map((week, wi) => (
                                <div key={wi} className="flex gap-1">
                                    {week.map((day, di) => (
                                        <div
                                            key={di}
                                            className={`w-8 h-8 rounded-md ${getCalendarColor(day.count, day.isFuture)} transition-all hover:ring-1 hover:ring-emerald-400/30 cursor-default relative group`}
                                            title={`${day.dayLabel}: ${day.count} sessions`}
                                        >
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                <div className="bg-black/90 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap">
                                                    {day.dayLabel}: {day.count} {t('dashboard.progress.sessions')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-muted">{t('dashboard.progress.less')}</span>
                            <div className="w-4 h-4 rounded-sm bg-white/[0.06]"></div>
                            <div className="w-4 h-4 rounded-sm bg-emerald-500/30"></div>
                            <div className="w-4 h-4 rounded-sm bg-emerald-500/50"></div>
                            <div className="w-4 h-4 rounded-sm bg-emerald-500/80"></div>
                            <span className="text-xs text-muted">{t('dashboard.progress.more')}</span>
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="section-title text-2xl mb-4">{t('dashboard.progress.physioNotes')}</h2>
                    {notes.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {notes.map((note) => (
                                <div key={note.note_id} className="card p-5 border-l-4 border-l-teal-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm text-muted">
                                            {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-primary mb-4 whitespace-pre-wrap">{note.note_content}</p>
                                    <div className="flex gap-4">
                                        {note.pain_level !== null && (
                                            <div className="flex items-center gap-2 text-sm bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20">
                                                <span>{t('dashboard.progress.painLevel')}:</span>
                                                <span className="font-bold">{note.pain_level}/10</span>
                                            </div>
                                        )}
                                        {note.mobility_level !== null && (
                                            <div className="flex items-center gap-2 text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                                                <span>{t('dashboard.progress.mobility')}:</span>
                                                <span className="font-bold">{note.mobility_level}/10</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card p-8 text-center text-muted">
                            {t('dashboard.progress.noNotes')}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="section-title text-2xl mb-4">{t('dashboard.progress.sessionHistory')}</h2>
                    {sessions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sessions.map((session) => (
                                <div key={session.session_id} className="card p-5">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-lg text-emerald-400">
                                            {session.title === "Training Session" ? t('dashboard.progress.trainingSession') : session.title}
                                        </h3>
                                        {session.created_at && (
                                            <span className="text-xs text-muted">
                                                {new Date(session.created_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {session.results && session.results.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {session.results.map((res, idx) => (
                                                <div key={idx} className="bg-main border border-outline rounded-lg p-3 text-sm">
                                                    <div className="font-medium text-white mb-1">{res.exercise_name}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-muted mb-2">
                                                        <div>{t('dashboard.progress.reps')}: <span className="text-white">{res.reps_completed}</span></div>
                                                        <div>{t('dashboard.progress.accuracy')}: <span className="text-white">{Math.round(res.avg_accuracy)}%</span></div>
                                                    </div>
                                                    <div className="text-xs text-emerald-500/80 italic">
                                                        &ldquo;{res.ai_feedback === "Exercise completed" ? t('dashboard.progress.exerciseCompletedMsg') : res.ai_feedback}&rdquo;
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted">{t('dashboard.progress.noExercises')}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card p-8 text-center text-muted">
                            {t('dashboard.progress.noSessions')}
                        </div>
                    )}
                </section>
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
