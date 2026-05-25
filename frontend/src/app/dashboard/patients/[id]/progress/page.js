"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PhysioPatientProgressPage({ params }) {
    const { id } = use(params);
    const patientId = parseInt(id, 10);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [notes, setNotes] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Form state
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
            const [notesData, sessionsData] = await Promise.all([
                api.progress.getNotesByPatient(patientId),
                api.progress.getSessionsByPatient(patientId)
            ]);
            setNotes(notesData);
            setSessions(sessionsData);
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
                <div className="w-full max-w-4xl flex items-center justify-between">
                    <Link href="/dashboard/patients" className="btn-ghost text-muted">
                        ← Back to Patients
                    </Link>
                </div>
                <h1 className="page-title text-3xl md:text-4xl">Patient Progress</h1>
                <p className="text-sm text-muted">Track patient's rehabilitation journey and add notes</p>
            </div>

            <div className="w-full max-w-4xl animate-fade-in flex flex-col gap-8">
                {error && <div className="error-box">⚠️ {error}</div>}

                <section className="card p-6 border border-emerald-500/30">
                    <h2 className="text-xl font-bold mb-4 text-emerald-400">Add Progress Note</h2>
                    <form onSubmit={handleAddNote} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted">Note Content</label>
                            <textarea
                                required
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                className="input-field min-h-[100px] resize-y"
                                placeholder="Describe patient's progress, issues, or next steps..."
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted">Pain Level (1-10)</label>
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
                                <label className="text-sm text-muted">Mobility Level (1-10)</label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <h2 className="section-title text-2xl mb-4">Past Notes</h2>
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
                                No progress notes yet.
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="section-title text-2xl mb-4">Exercise Sessions</h2>
                        {sessions.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {sessions.map((session) => (
                                    <div key={session.session_id} className="card p-5 border border-outline">
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
