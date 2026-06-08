"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, ChartTooltip, Legend, Filler);

export default function PhysioPatientProgressPage({ params }) {
    const { id } = use(params);
    const patientId = parseInt(id, 10);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [notes, setNotes] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exerciseFilter, setExerciseFilter] = useState("");

    const [noteContent, setNoteContent] = useState("");
    const [painLevel, setPainLevel] = useState("");
    const [mobilityLevel, setMobilityLevel] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchProgress = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [notesData, sessionsData, historyData, summaryData] = await Promise.all([
                api.progress.getNotesByPatient(patientId),
                api.progress.getSessionsByPatient(patientId),
                api.progress.getHistory(patientId),
                api.progress.getSummary(patientId)
            ]);
            setNotes(notesData);
            setSessions(sessionsData);
            setHistory(historyData);
            setSummary(summaryData);
        } catch (err) {
            setError(err.message || "Failed to load progress data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.role === "fizjoterapeuta") {
            fetchProgress();
        }
    }, [user, patientId]);

    const handleAddNote = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            await api.progress.createNote({
                patient_id: patientId,
                note_content: noteContent,
                pain_level: painLevel ? parseInt(painLevel, 10) : null,
                mobility_level: mobilityLevel ? parseInt(mobilityLevel, 10) : null,
            });
            setNoteContent("");
            setPainLevel("");
            setMobilityLevel("");
            await fetchProgress();
        } catch (err) {
            setError(err.message || "Failed to add progress note");
        } finally {
            setSubmitting(false);
        }
    };

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

    const combinedChartData = useMemo(() => {
        if (!filteredHistory || filteredHistory.length === 0) return null;

        const labels = filteredHistory.map((s, i) => {
            if (s.created_at) {
                const d = new Date(s.created_at);
                return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
            }
            return `Session ${i + 1}`;
        });

        const accuracyData = filteredHistory.map(s => {
            const accs = s.results.filter(r => r.avg_accuracy != null).map(r => r.avg_accuracy);
            return accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length * 10) / 10 : null;
        });

        const repsData = filteredHistory.map(s => {
            const reps = s.results.filter(r => r.reps_completed != null).map(r => r.reps_completed);
            return reps.length > 0 ? reps.reduce((a, b) => a + b, 0) : null;
        });

        const datasets = [
            {
                label: "Accuracy (%)",
                data: accuracyData,
                borderColor: "rgb(52, 211, 153)",
                backgroundColor: "rgba(52, 211, 153, 0.05)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "rgb(52, 211, 153)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: "y",
            },
            {
                label: "Total repetitions",
                data: repsData,
                borderColor: "rgb(251, 191, 36)",
                backgroundColor: "transparent",
                fill: false,
                tension: 0.4,
                pointBackgroundColor: "rgb(251, 191, 36)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: "y1",
                borderDash: [2, 3],
            }
        ];

        return { labels, datasets };
    }, [filteredHistory]);

    const combinedChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: "top",
                labels: {
                    color: "rgba(255,255,255,0.6)",
                    usePointStyle: true,
                    pointStyleWidth: 12,
                    padding: 16,
                    font: { size: 11 }
                }
            },
            tooltip: {
                backgroundColor: "rgba(0,0,0,0.85)",
                titleColor: "#fff",
                bodyColor: "#fff",
                padding: 14,
                cornerRadius: 10,
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
                type: "linear",
                display: true,
                position: "left",
                title: { display: true, text: "Accuracy (%)", color: "rgba(52,211,153,0.7)", font: { size: 11 } },
                ticks: { color: "rgba(52,211,153,0.6)", font: { size: 10 } },
                grid: { color: "rgba(255,255,255,0.05)" },
                beginAtZero: true,
                max: 100,
            },
            y1: {
                type: "linear",
                display: true,
                position: "right",
                title: { display: true, text: "Repetitions", color: "rgba(96,165,250,0.7)", font: { size: 11 } },
                ticks: { color: "rgba(96,165,250,0.6)", font: { size: 10 } },
                grid: { drawOnChartArea: false },
            },
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
        <div className="page-container flex flex-col items-center">
            <div className="w-full max-w-5xl flex items-center justify-start animate-fade-in mb-4">
                <Link href="/dashboard/patients" className="btn-ghost text-muted text-sm font-semibold">
                    ← Back to patients
                </Link>
            </div>

            <div className="flex flex-col items-center gap-2 animate-scale-up mb-8">
                <h1 className="page-title text-3xl md:text-4xl">Patient Progress</h1>
                <p className="text-sm text-muted">Detailed analytics and progress notes</p>
            </div>

            <div className="w-full max-w-5xl animate-fade-in flex flex-col gap-8">
                {error && <div className="error-box">⚠️ {error}</div>}

                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="card p-4 flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Status</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${summary.status === "green" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" :
                                    summary.status === "red" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" :
                                        "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                    }`}></span>
                                <span className={`text-sm font-bold ${summary.status === "green" ? "text-emerald-400" :
                                    summary.status === "red" ? "text-red-400" :
                                        "text-amber-400"
                                    }`}>
                                    {summary.status === "green" ? "OK" : summary.status === "red" ? "Warning" : "No plan"}
                                </span>
                            </div>
                        </div>

                        <div className="card p-4 flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Total sessions</span>
                            <span className="text-2xl font-black text-blue-400">{summary.total_sessions}</span>
                        </div>

                        <div className="card p-4 flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Avg. accuracy</span>
                            <span className="text-2xl font-black text-violet-400">
                                {summary.overall_avg_accuracy != null ? `${summary.overall_avg_accuracy}%` : "—"}
                            </span>
                        </div>

                        <div className="card p-4 flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Trend</span>
                            <span className={`text-2xl font-black ${summary.accuracy_trend != null ? (summary.accuracy_trend >= 0 ? "text-emerald-400" : "text-red-400") : "text-muted"
                                }`}>
                                {summary.accuracy_trend != null ? `${summary.accuracy_trend >= 0 ? "+" : ""}${summary.accuracy_trend}%` : "—"}
                            </span>
                        </div>

                        <div className="card p-4 flex flex-col gap-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full"></div>
                            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Last activity</span>
                            <span className="text-lg font-bold text-rose-400">
                                {summary.days_since_activity != null
                                    ? summary.days_since_activity === 0 ? "Today" : `${summary.days_since_activity}d ago`
                                    : "None"}
                            </span>
                        </div>
                    </div>
                )}

                {/* Combined Analytics Chart */}
                {history.length > 0 && (
                    <section className="card p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold">Progress Analytics</h2>
                                <p className="text-xs text-muted mt-1">Accuracy and repetitions in one view</p>
                            </div>
                            {exercises.length > 0 && (
                                <select
                                    value={exerciseFilter}
                                    onChange={e => setExerciseFilter(e.target.value)}
                                    className="input-field w-auto text-xs !py-1.5 !px-3 !rounded-lg"
                                >
                                    <option value="">All exercises</option>
                                    {exercises.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="h-[350px]">
                            {combinedChartData ? (
                                <Line data={combinedChartData} options={combinedChartOptions} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted text-sm">
                                    None danych do wyświetlenia
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Add Progress Note Form */}
                <section className="card p-6 border border-emerald-500/30">
                    <h2 className="text-xl font-bold mb-4 text-emerald-400">Add Note</h2>
                    <form onSubmit={handleAddNote} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted">Note content</label>
                            <textarea
                                required
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                className="input-field min-h-[100px] resize-y"
                                placeholder="Describe patient progress, issues or next steps..."
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted">Pain level (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={painLevel}
                                    onChange={(e) => setPainLevel(e.target.value)}
                                    className="input-field"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted">Mobility level (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={mobilityLevel}
                                    onChange={(e) => setMobilityLevel(e.target.value)}
                                    className="input-field"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary w-fit self-end mt-2">
                            {submitting ? "Saving..." : "Save Note"}
                        </button>
                    </form>
                </section>

                {/* Notes & Sessions in two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <h2 className="section-title text-2xl mb-4">Notes</h2>
                        {notes.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {notes.map((note) => (
                                    <div key={note.note_id} className="card p-5 border-l-4 border-l-teal-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm text-muted">
                                                {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-200 mb-4 whitespace-pre-wrap">{note.note_content}</p>
                                        <div className="flex gap-4">
                                            {note.pain_level !== null && (
                                                <div className="flex items-center gap-2 text-sm bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20">
                                                    <span>Pain:</span>
                                                    <span className="font-bold">{note.pain_level}/10</span>
                                                </div>
                                            )}
                                            {note.mobility_level !== null && (
                                                <div className="flex items-center gap-2 text-sm bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                                                    <span>Mobility:</span>
                                                    <span className="font-bold">{note.mobility_level}/10</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card p-8 text-center text-muted">
                                None notatek.
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="section-title text-2xl mb-4">Exercise Sessions</h2>
                        {sessions.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {sessions.map((session) => (
                                    <div key={session.session_id} className="card p-5 border border-outline">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-lg text-emerald-400">{session.title}</h3>
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
                                                            <div>Reps: <span className="text-white">{res.reps_completed}</span></div>
                                                            <div>Accuracy: <span className="text-white">{Math.round(res.avg_accuracy)}%</span></div>
                                                        </div>
                                                        {res.ai_feedback && (
                                                            <div className="text-xs text-emerald-500/80 italic">
                                                                &ldquo;{res.ai_feedback}&rdquo;
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted">None ćwiczeń w tej sesji.</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card p-8 text-center text-muted">
                                None ukończonych sesji.
                            </div>
                        )}
                    </section>
                </div>
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
