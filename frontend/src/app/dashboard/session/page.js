"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import PoseDetector from "@/features/pose/PoseDetector";

export default function SessionPage() {
    const { user, loading: authLoading } = useAuth();
    const { plan, loading, error, fetchMyPlan, submitSession } = usePatient();
    const router = useRouter();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionFinished, setSessionFinished] = useState(false);
    const [exerciseResults, setExerciseResults] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [isPaused, setIsPaused] = useState(false);
    const [currentMetrics, setCurrentMetrics] = useState({ accuracy: 0, meanAccuracy: 0, maxRom: 0, isCameraStale: false });
    const [showEndModal, setShowEndModal] = useState(false);

    const [painLevel, setPainLevel] = useState(0);
    const [patientNote, setPatientNote] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) fetchMyPlan();
    }, [user, fetchMyPlan]);

    const exercisesWithVideo = plan?.exercises?.filter((ex) => ex.video_url) || [];
    const currentExercise = exercisesWithVideo[currentIndex] || null;
    const totalExercises = exercisesWithVideo.length;

    const handleStartSession = () => {
        setSessionStarted(true);
        setCurrentIndex(0);
        setExerciseResults([]);
        setSessionFinished(false);
        setIsPaused(false);
        setCurrentMetrics({ accuracy: 0, meanAccuracy: 0, maxRom: 0, isCameraStale: false });
    };

    const handleMetricsUpdate = useCallback((metrics) => {
        setCurrentMetrics(prev => ({
            ...prev,
            accuracy: metrics.accuracy !== undefined ? metrics.accuracy : prev.accuracy,
            meanAccuracy: metrics.meanAccuracy !== undefined ? metrics.meanAccuracy : prev.meanAccuracy,
            maxRom: metrics.maxRom !== undefined ? Math.max(prev.maxRom, metrics.maxRom) : prev.maxRom,
            isCameraStale: metrics.isCameraStale !== undefined ? metrics.isCameraStale : prev.isCameraStale
        }));
    }, []);

    const triggerEndExercise = () => {
        setIsPaused(true);
        setShowEndModal(true);
    };

    const handleSaveExerciseAndNext = () => {
        setExerciseResults((prev) => [
            ...prev,
            {
                exercise_id: currentExercise.exercise_id,
                reps: currentExercise.reps_nr,
                accuracy: currentMetrics.meanAccuracy,
                feedback: "Exercise completed",
                pain_level: parseInt(painLevel, 10),
                patient_note: patientNote
            },
        ]);

        setPainLevel(0);
        setPatientNote("");
        setShowEndModal(false);
        setCurrentMetrics({ accuracy: 0, meanAccuracy: 0, maxRom: 0, isCameraStale: false });

        if (currentIndex + 1 < totalExercises) {
            setCurrentIndex((prev) => prev + 1);
            setIsPaused(false);
        } else {
            setSessionFinished(true);
        }
    };

    const handleFinishSession = async () => {
        if (!plan) return;
        setSubmitting(true);
        try {
            await submitSession(plan.rehab_id, exerciseResults);
            router.push("/dashboard");
        } catch (err) {
            // error
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

    if (error) {
        return (
            <div className="page-container">
                <div className="error-box">⚠️ {error}</div>
            </div>
        );
    }

    if (!plan || exercisesWithVideo.length === 0) {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title text-3xl md:text-4xl">Exercise Session</h1>
                </div>
                <div className="card p-12 flex flex-col items-center gap-4 max-w-lg animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-main border border-outline flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold">No exercises with video</h3>
                    <p className="text-sm text-muted text-center max-w-sm">
                        Your physiotherapist hasn't assigned instructional videos to your exercises. The session requires a video for real-time comparison.
                    </p>
                    <button onClick={() => router.push("/dashboard/plan")} className="btn-outline mt-2">
                        Back to Plan
                    </button>
                </div>
            </div>
        );
    }

    if (sessionFinished) {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title text-3xl md:text-4xl">Session Completed! 🎉</h1>
                </div>
                <div className="card p-8 flex flex-col items-center gap-6 max-w-lg animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Congratulations!</h2>
                        <p className="text-sm text-muted">
                            You have completed {exerciseResults.length} exercises in this session.
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-2">
                        {exerciseResults.map((res, i) => {
                            const ex = exercisesWithVideo.find((e) => e.exercise_id === res.exercise_id);
                            return (
                                <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-main border border-outline">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                                ✓
                                            </span>
                                            <span className="text-sm font-medium">{ex?.name || `Exercise ${res.exercise_id}`}</span>
                                        </div>
                                        <span className="badge-success">{res.accuracy}% Accuracy</span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-muted ml-8 mt-1">
                                        <span>Pain: <strong className={res.pain_level > 5 ? "text-red-400" : "text-emerald-400"}>{res.pain_level}/10</strong></span>
                                        {res.patient_note && <span className="truncate max-w-[150px]">Note: {res.patient_note}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={handleFinishSession} disabled={submitting} className="btn-primary flex items-center gap-2 px-8">
                            {submitting ? (
                                <>
                                    <Spinner /> Saving...
                                </>
                            ) : (
                                "Save and Finish"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!sessionStarted) {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title text-3xl md:text-4xl">Start Training</h1>
                    <p className="text-sm text-muted">Perform exercises with the AI assistant</p>
                </div>

                <div className="card p-8 flex flex-col gap-6 max-w-2xl w-full animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="section-title">{plan.title}</h2>
                            <p className="text-xs text-muted">{totalExercises} exercises in the plan</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Session Plan</h3>
                        {exercisesWithVideo.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-main border border-outline">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                                        {i + 1}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{ex.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="badge-info">{ex.reps_nr} reps</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-3 pt-2">
                        <p className="text-xs text-muted text-center max-w-md">
                            Ensure good lighting and full-body visibility in the frame.
                        </p>
                        <button onClick={handleStartSession} className="btn-primary text-lg px-10 py-4 flex items-center gap-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            Start Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const videoUrl = currentExercise.video_url;

    return (
        <div className="page-container relative min-h-screen pb-32">
            {showEndModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="card p-8 w-full max-w-md animate-scale-up flex flex-col gap-6 shadow-2xl shadow-emerald-500/20 border-emerald-500/30">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Great job!</h2>
                            <p className="text-sm text-muted">You finished exercise: {currentExercise.name}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider">
                                Rate your pain level (0 - none, 10 - very strong)
                            </label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="range"
                                    min="0" max="10"
                                    value={painLevel}
                                    onChange={(e) => setPainLevel(e.target.value)}
                                    className="w-full accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs font-bold px-1">
                                    <span className="text-emerald-400">0</span>
                                    <span className="text-amber-400">5</span>
                                    <span className="text-rose-500">10</span>
                                </div>
                                <div className="text-center text-2xl font-black text-white mt-2">
                                    {painLevel}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted uppercase tracking-wider">
                                Note for the physiotherapist (Optional)
                            </label>
                            <textarea
                                value={patientNote}
                                onChange={(e) => setPatientNote(e.target.value)}
                                placeholder="E.g., I felt discomfort at full flexion..."
                                className="input-field resize-none h-24 text-sm"
                            />
                        </div>

                        <button
                            onClick={handleSaveExerciseAndNext}
                            className="btn-primary w-full py-4 text-lg"
                        >
                            {currentIndex + 1 < totalExercises ? "Save and Continue" : "Finish Session"}
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-7xl animate-fade-in bg-panel border border-outline rounded-2xl p-4 md:p-6 mb-6 shadow-panel">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex flex-col items-center justify-center border border-emerald-500/20">
                            <span className="text-emerald-400 font-bold text-lg leading-none">{currentIndex + 1}</span>
                            <span className="text-xs text-muted leading-none mt-1">of {totalExercises}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
                            <p className="text-sm text-muted">Mimic the movements from the instructional video.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center justify-center">
                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-main rounded-xl border border-outline">
                            <span className="text-xs text-muted uppercase font-bold tracking-wider">Set</span>
                            <span className="text-xl font-bold text-white">1/{currentExercise.sets_nr}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-main rounded-xl border border-outline">
                            <span className="text-xs text-muted uppercase font-bold tracking-wider">Target</span>
                            <span className="text-xl font-bold text-emerald-400">{currentExercise.reps_nr} reps</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`w-full max-w-7xl relative transition-all duration-300 ${isPaused ? 'opacity-50 blur-[2px] pointer-events-none' : ''}`}>
                {currentMetrics.isCameraStale && !isPaused && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-rose-500/30 flex items-center gap-3 animate-fade-in backdrop-blur-md border border-rose-400 pointer-events-none">
                        <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Adjust your camera! Key body parts are not visible.
                    </div>
                )}
                <PoseDetector
                    referenceVideoUrl={videoUrl}
                    isPaused={isPaused}
                    onMetricsUpdate={handleMetricsUpdate}
                />
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-panel/90 backdrop-blur-xl border-t border-outline p-4 z-40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted uppercase font-bold tracking-wider">Current Accuracy</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${currentMetrics.accuracy > 80 ? 'text-emerald-400' : currentMetrics.accuracy > 50 ? 'text-amber-400' : 'text-rose-500'}`}>
                                    {currentMetrics.accuracy}%
                                </span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-outline"></div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted uppercase font-bold tracking-wider">Mean Accuracy</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${currentMetrics.meanAccuracy > 80 ? 'text-emerald-400' : currentMetrics.meanAccuracy > 50 ? 'text-amber-400' : 'text-rose-500'}`}>
                                    {currentMetrics.meanAccuracy}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="px-6 py-3 rounded-2xl font-semibold text-sm bg-main border border-outline text-white hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                            {isPaused ? (
                                <>
                                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    Resume
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    Pause
                                </>
                            )}
                        </button>

                        <button
                            onClick={triggerEndExercise}
                            className="px-8 py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            Next
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <div className="w-px h-8 bg-outline mx-2 hidden md:block"></div>

                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to abort the session? Your current progress will be lost.")) {
                                    setSessionStarted(false);
                                }
                            }}
                            className="px-6 py-3 rounded-2xl font-semibold text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Abort
                        </button>
                    </div>

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
