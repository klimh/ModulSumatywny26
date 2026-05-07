"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CreatePlanForm() {
    const { user, loading: authLoading } = useAuth();
    const { patients, exercises, loading, error, fetchMyPatients, fetchExercises, createPlan } = usePhysio();
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedPatient = searchParams.get("patient_id");

    const [selectedPatient, setSelectedPatient] = useState("");
    const [planTitle, setPlanTitle] = useState("");
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [formError, setFormError] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== "fizjoterapeuta")) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "fizjoterapeuta") {
            fetchMyPatients();
            fetchExercises();
        }
    }, [user, fetchMyPatients, fetchExercises]);

    useEffect(() => {
        if (preselectedPatient && patients.length > 0) {
            setSelectedPatient(preselectedPatient);
        }
    }, [preselectedPatient, patients]);

    const addExerciseRow = () => {
        setSelectedExercises(prev => [...prev, { exercise_id: "", reps_nr: 10, sets_nr: 3 }]);
    };

    const removeExerciseRow = (index) => {
        setSelectedExercises(prev => prev.filter((_, i) => i !== index));
    };

    const updateExerciseRow = (index, field, value) => {
        setSelectedExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, [field]: value } : ex
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedPatient) {
            setFormError("Please select a patient");
            return;
        }

        if (selectedExercises.length === 0) {
            setFormError("Please add at least one exercise");
            return;
        }

        const invalidExercise = selectedExercises.find(ex => !ex.exercise_id);
        if (invalidExercise) {
            setFormError("Please select an exercise for each row");
            return;
        }

        setFormLoading(true);
        try {
            await createPlan({
                patient_id: parseInt(selectedPatient),
                title: planTitle || "Rehabilitation Plan",
                exercise: selectedExercises.map(ex => ({
                    exercise_id: parseInt(ex.exercise_id),
                    reps_nr: parseInt(ex.reps_nr),
                    sets_nr: parseInt(ex.sets_nr),
                })),
            });
            setSuccess(true);
            setTimeout(() => router.push("/dashboard"), 2000);
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
                <h1 className="page-title text-3xl md:text-4xl">Create Rehab Plan</h1>
                <p className="text-sm text-muted">Build a personalized rehabilitation program</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in">
                {error && <div className="error-box mb-4">⚠️ {error}</div>}

                {success ? (
                    <div className="card p-8 flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold">Plan Created!</h2>
                        <p className="text-sm text-muted">Redirecting to dashboard…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-6">
                        {formError && <div className="error-box">⚠️ {formError}</div>}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="plan-title" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Plan Title
                            </label>
                            <input
                                id="plan-title"
                                type="text"
                                value={planTitle}
                                onChange={(e) => setPlanTitle(e.target.value)}
                                placeholder="e.g. Post-Surgery Knee Rehab"
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="patient-select" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Patient
                            </label>
                            <select
                                id="patient-select"
                                value={selectedPatient}
                                onChange={(e) => setSelectedPatient(e.target.value)}
                                required
                                className="input-field cursor-pointer"
                            >
                                <option value="">Select a patient…</option>
                                {patients.map((p) => (
                                    <option key={p.user_id} value={p.user_id}>
                                        {p.first_name} {p.last_name} ({p.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                                    Exercises
                                </span>
                                <button
                                    type="button"
                                    onClick={addExerciseRow}
                                    className="btn-ghost text-teal-400 hover:text-teal-300"
                                >
                                    + Add Row
                                </button>
                            </div>

                            {selectedExercises.length === 0 ? (
                                <div className="p-6 rounded-xl border-2 border-dashed border-outline text-center">
                                    <p className="text-sm text-muted">
                                        No exercises added yet. Click &quot;+ Add Row&quot; to begin.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {selectedExercises.map((ex, i) => (
                                        <div key={i} className="flex items-end gap-3 p-4 rounded-xl bg-main border border-outline">
                                            <div className="flex-1 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">Exercise</label>
                                                <select
                                                    value={ex.exercise_id}
                                                    onChange={(e) => updateExerciseRow(i, "exercise_id", e.target.value)}
                                                    className="input-field cursor-pointer"
                                                    required
                                                >
                                                    <option value="">Select…</option>
                                                    {exercises.map((e) => (
                                                        <option key={e.exercise_id} value={e.exercise_id}>
                                                            {e.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-20 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">Reps</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={ex.reps_nr}
                                                    onChange={(e) => updateExerciseRow(i, "reps_nr", e.target.value)}
                                                    className="input-field text-center"
                                                />
                                            </div>
                                            <div className="w-20 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">Sets</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={ex.sets_nr}
                                                    onChange={(e) => updateExerciseRow(i, "sets_nr", e.target.value)}
                                                    className="input-field text-center"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeExerciseRow(i)}
                                                className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all duration-300 cursor-pointer flex-shrink-0"
                                                aria-label="Remove exercise"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {formLoading ? (
                                <>
                                    <Spinner />
                                    Creating plan…
                                </>
                            ) : (
                                "Create Plan"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function CreatePlanPage() {
    return (
        <Suspense fallback={
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        }>
            <CreatePlanForm />
        </Suspense>
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
