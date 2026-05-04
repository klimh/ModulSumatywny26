"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";

export default function ExercisesPage() {
    const { user, loading: authLoading } = useAuth();
    const { exercises, loading, error, fetchExercises, addExercise } = usePhysio();
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", body_part: "" });
    const [formError, setFormError] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "fizjoterapeuta") fetchExercises();
    }, [user, fetchExercises]);

    const handleAddExercise = async (e) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);
        try {
            await addExercise(form);
            setForm({ name: "", description: "", body_part: "" });
            setShowForm(false);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
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
                <h1 className="page-title text-3xl md:text-4xl">Exercise Library</h1>
                <p className="text-sm text-muted">Manage the shared exercise database</p>
            </div>

            <div className="w-full max-w-3xl flex flex-col gap-6 animate-fade-in">
                {error && <div className="error-box">⚠️ {error}</div>}

                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">
                        {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} total
                    </span>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={showForm ? "btn-outline" : "btn-primary"}
                    >
                        {showForm ? "Cancel" : "+ Add Exercise"}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleAddExercise} className="card p-6 flex flex-col gap-4 animate-fade-in">
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
                            New Exercise
                        </h3>

                        {formError && <div className="error-box">⚠️ {formError}</div>}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-name" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Exercise Name
                            </label>
                            <input
                                id="ex-name"
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Shoulder Flexion"
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-body-part" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Body Part
                            </label>
                            <input
                                id="ex-body-part"
                                type="text"
                                value={form.body_part}
                                onChange={(e) => setForm(prev => ({ ...prev, body_part: e.target.value }))}
                                placeholder="e.g. Shoulder, Knee, Hip"
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-desc" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Description
                            </label>
                            <textarea
                                id="ex-desc"
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe the exercise technique…"
                                rows={3}
                                className="input-field resize-none"
                            />
                        </div>

                        <button type="submit" disabled={formLoading} className="btn-primary w-fit flex items-center gap-2">
                            {formLoading ? <><Spinner /> Saving…</> : "Save Exercise"}
                        </button>
                    </form>
                )}

                {exercises.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {exercises.map((ex, i) => (
                            <div key={ex.exercise_id || i} className="card p-5 flex items-start gap-4">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center text-fuchsia-400 font-bold text-sm flex-shrink-0">
                                    {i + 1}
                                </span>
                                <div className="flex flex-col gap-1 flex-1">
                                    <span className="font-semibold">{ex.name}</span>
                                    {ex.body_part && (
                                        <span className="badge-info w-fit">{ex.body_part}</span>
                                    )}
                                    {ex.description && (
                                        <span className="text-xs text-muted mt-1">{ex.description}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card p-12 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">No Exercises</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            The exercise library is empty. Click the button above to add the first exercise.
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
