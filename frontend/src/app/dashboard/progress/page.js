"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function PatientProgressPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                const [notesData, sessionsData] = await Promise.all([
                    api.progress.getNotesByPatient(user.user_id),
                    api.progress.getSessionsByPatient(user.user_id)
                ]);
                setNotes(notesData);
                setSessions(sessionsData);
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
                <h1 className="page-title text-3xl md:text-4xl">My Progress</h1>
                <p className="text-sm text-muted">Track your rehabilitation journey</p>
            </div>

            <div className="w-full max-w-4xl animate-fade-in flex flex-col gap-8">
                {error && <div className="error-box">⚠️ {error}</div>}

                <section>
                    <h2 className="section-title text-2xl mb-4">Physiotherapist Notes</h2>
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
                                                <span>Pain Level:</span>
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
                            No progress notes yet.
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="section-title text-2xl mb-4">Exercise Sessions</h2>
                    {sessions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sessions.map((session) => (
                                <div key={session.session_id} className="card p-5">
                                    <h3 className="font-semibold text-lg text-emerald-400 mb-3">{session.title}</h3>
                                    {session.results && session.results.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {session.results.map((res, idx) => (
                                                <div key={idx} className="bg-main border border-outline rounded-lg p-3 text-sm">
                                                    <div className="font-medium text-white mb-1">{res.exercise_name}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-muted mb-2">
                                                        <div>Reps: <span className="text-white">{res.reps_completed}</span></div>
                                                        <div>Accuracy: <span className="text-white">{Math.round(res.avg_accuracy)}%</span></div>
                                                    </div>
                                                    <div className="text-xs text-emerald-500/80 italic">
                                                        "{res.ai_feedback}"
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted">No exercises recorded in this session.</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card p-8 text-center text-muted">
                            No exercise sessions completed yet.
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
