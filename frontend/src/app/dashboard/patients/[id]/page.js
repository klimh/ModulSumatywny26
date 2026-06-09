"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

export default function PatientDetailsPage({ params }) {
    const { id } = use(params);
    const patientId = parseInt(id);
    const { t } = useTranslation();

    const { user, loading: authLoading } = useAuth();
    const { patients, exercises, loading: physioLoading, error, fetchMyPatients, fetchExercises, createPlan } = usePhysio();
    const router = useRouter();

    const [patient, setPatient] = useState(null);
    const [planTitle, setPlanTitle] = useState("");
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

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
        const loadData = async () => {
            if (!patients || patients.length === 0) return;

            const currentPatient = patients.find(p => p.user_id === patientId);
            if (!currentPatient) {
                setFormError(t('dashboard.patientDetails.notFound'));
                setInitialLoading(false);
                return;
            }
            setPatient(currentPatient);

            try {
                const [allPlans, patientSummary] = await Promise.all([
                    api.physio.getMyPlans(),
                    api.progress.getSummary(patientId).catch(() => null)
                ]);

                setSummary(patientSummary);
                const activePlan = allPlans.find(p => p.patient_id === patientId && p.is_active);

                if (activePlan) {
                    setPlanTitle(activePlan.title);
                    setSelectedExercises(activePlan.exercises.map(ex => ({
                        exercise_id: ex.exercise_id.toString(),
                        reps_nr: ex.reps_nr,
                        sets_nr: ex.sets_nr
                    })));
                } else {
                    setSelectedExercises([]);
                    setPlanTitle("");
                }
            } catch (err) {
                console.error("Error loading plans", err);
            } finally {
                setInitialLoading(false);
            }
        };

        if (patients.length > 0) {
            loadData();
        }
    }, [patients, patientId]);

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

        if (selectedExercises.length === 0) {
            setFormError(t('dashboard.patientDetails.atLeastOne'));
            return;
        }

        const invalidExercise = selectedExercises.find(ex => !ex.exercise_id);
        if (invalidExercise) {
            setFormError(t('dashboard.patientDetails.selectEach'));
            return;
        }

        setFormLoading(true);
        try {
            await createPlan({
                patient_id: patientId,
                title: planTitle || t('dashboard.patientDetails.rehabPlan'),
                exercise: selectedExercises.map(ex => ({
                    exercise_id: parseInt(ex.exercise_id),
                    reps_nr: parseInt(ex.reps_nr),
                    sets_nr: parseInt(ex.sets_nr),
                })),
            });
            setSuccess(true);
            setIsEditingPlan(false);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    if (authLoading || physioLoading || initialLoading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="page-container justify-center items-center">
                <div className="error-box">{t('dashboard.patientDetails.accessDenied')}</div>
                <Link href="/dashboard/patients" className="btn-ghost mt-4">{t('dashboard.patientDetails.back')}</Link>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="w-full max-w-4xl flex justify-start">
                <Link href="/dashboard/patients" className="text-sm text-muted hover:text-white transition-colors mb-4 inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('dashboard.patientDetails.back')}
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-scale-up w-full max-w-4xl">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <span className="text-white font-bold text-2xl">
                            {patient.first_name?.[0]?.toUpperCase()}{patient.last_name?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h1 className="page-title text-3xl md:text-4xl m-0">{patient.first_name} {patient.last_name}</h1>
                        <p className="text-sm text-muted">{patient.email}</p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl animate-fade-in flex flex-col gap-6">
                {error && <div className="error-box">{error}</div>}

                {success && (
                    <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-center font-medium">
                        {t('dashboard.patientDetails.success')}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card p-6 flex flex-col justify-between gap-4 border border-outline/50">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t('dashboard.patientDetails.activePlan')}</span>
                            <span className="text-xl font-bold text-teal-400">{planTitle || t('dashboard.patientDetails.noActivePlan')}</span>
                            <span className="text-sm text-muted">{t('dashboard.patientDetails.exercisesAssigned').replace('{n}', selectedExercises.length)}</span>
                        </div>
                        <button
                            onClick={() => setIsEditingPlan(!isEditingPlan)}
                            className={`btn-primary mt-2 w-full ${isEditingPlan ? 'bg-panel text-primary border-outline hover:bg-main' : ''}`}
                        >
                            {isEditingPlan ? t('dashboard.patientDetails.cancelEdit') : planTitle ? t('dashboard.patientDetails.editPlan') : t('dashboard.patientDetails.createPlan')}
                        </button>
                    </div>

                    <div className="card p-6 flex flex-col justify-between gap-4 border border-outline/50">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t('dashboard.patientDetails.progress')}</span>
                            <span className="text-xl font-bold text-orange-400">
                                {summary?.overall_avg_accuracy != null ? t('dashboard.patientDetails.avgAccuracy').replace('{acc}', Math.round(summary.overall_avg_accuracy)) : t('dashboard.patientDetails.noData')}
                            </span>
                            <span className="text-sm text-muted">
                                {t('dashboard.patientDetails.sessionsCompleted').replace('{n}', summary?.total_sessions || 0)}
                            </span>
                        </div>
                        <Link
                            href={`/dashboard/patients/${patientId}/progress`}
                            className="btn-primary bg-panel text-primary border-outline hover:bg-main w-full mt-2"
                        >
                            {t('dashboard.patientDetails.viewProgress')}
                        </Link>
                    </div>
                </div>

                {isEditingPlan && (
                    <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-6 mt-4 animate-fade-in border border-teal-500/30">
                        <div>
                            <h2 className="text-xl font-bold">{t('dashboard.patientDetails.rehabPlan')}</h2>
                            <p className="text-xs text-muted mt-1">{t('dashboard.patientDetails.planUpdateInfo')}</p>
                        </div>

                        {formError && <div className="error-box">{formError}</div>}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="plan-title" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('dashboard.patientDetails.planTitle')}
                            </label>
                            <input
                                id="plan-title"
                                type="text"
                                value={planTitle}
                                onChange={(e) => setPlanTitle(e.target.value)}
                                placeholder={t('dashboard.patientDetails.planTitlePlaceholder')}
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                                    {t('dashboard.patientDetails.exercises')}
                                </span>
                                <button
                                    type="button"
                                    onClick={addExerciseRow}
                                    className="btn-ghost text-teal-400 hover:text-teal-300"
                                >
                                    {t('dashboard.patientDetails.addRow')}
                                </button>
                            </div>

                            {selectedExercises.length === 0 ? (
                                <div className="p-6 rounded-xl border-2 border-dashed border-outline text-center">
                                    <p className="text-sm text-muted">
                                        {t('dashboard.patientDetails.noExercisesRow')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {selectedExercises.map((ex, i) => (
                                        <div key={i} className="flex items-end gap-3 p-4 rounded-xl bg-main border border-outline">
                                            <div className="flex-1 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">{t('dashboard.patientDetails.exercise')}</label>
                                                <select
                                                    value={ex.exercise_id}
                                                    onChange={(e) => updateExerciseRow(i, "exercise_id", e.target.value)}
                                                    className="input-field cursor-pointer"
                                                    required
                                                >
                                                    <option value="">{t('dashboard.patientDetails.select')}</option>
                                                    {exercises.map((e) => (
                                                        <option key={e.exercise_id} value={e.exercise_id}>
                                                            {e.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-20 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">{t('dashboard.patientDetails.reps')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={ex.reps_nr}
                                                    onChange={(e) => updateExerciseRow(i, "reps_nr", e.target.value)}
                                                    className="input-field text-center"
                                                />
                                            </div>
                                            <div className="w-20 flex flex-col gap-1">
                                                <label className="text-[10px] font-semibold text-muted uppercase">{t('dashboard.patientDetails.sets')}</label>
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
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                        >
                            {formLoading ? (
                                <>
                                    <Spinner />
                                    {t('dashboard.patientDetails.saving')}
                                </>
                            ) : (
                                t('dashboard.patientDetails.save')
                            )}
                        </button>
                    </form>
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
