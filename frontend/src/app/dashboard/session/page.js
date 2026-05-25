"use client";

import { useEffect, useState, useCallback } from "react";
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

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) fetchMyPlan();
    }, [user, fetchMyPlan]);

    // Filter exercises that have video_url
    const exercisesWithVideo = plan?.exercises?.filter((ex) => ex.video_url) || [];
    const currentExercise = exercisesWithVideo[currentIndex] || null;
    const totalExercises = exercisesWithVideo.length;

    const handleStartSession = () => {
        setSessionStarted(true);
        setCurrentIndex(0);
        setExerciseResults([]);
        setSessionFinished(false);
    };

    const handleNextExercise = useCallback(() => {
        // Save result for current exercise
        setExerciseResults((prev) => [
            ...prev,
            {
                exercise_id: currentExercise.exercise_id,
                reps: currentExercise.reps_nr,
                accuracy: 0,
                feedback: "Exercise completed",
            },
        ]);

        if (currentIndex + 1 < totalExercises) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            setSessionFinished(true);
        }
    }, [currentExercise, currentIndex, totalExercises]);

    const handleFinishSession = async () => {
        if (!plan) return;
        setSubmitting(true);
        try {
            await submitSession(plan.rehab_id, exerciseResults);
        } catch (err) {
            // error handled in hook
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
                        Your physiotherapist has not attached any instructional videos to your exercises yet. Please contact your physiotherapist.
                    </p>
                    <button onClick={() => router.push("/dashboard/plan")} className="btn-outline mt-2">
                        Back to Plan
                    </button>
                </div>
            </div>
        );
    }

    // Session finished screen
    if (sessionFinished) {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title text-3xl md:text-4xl">Session Complete! 🎉</h1>
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
                            You completed {exerciseResults.length} exercise{exerciseResults.length !== 1 ? "s" : ""} in this session.
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-2">
                        {exerciseResults.map((res, i) => {
                            const ex = exercisesWithVideo.find((e) => e.exercise_id === res.exercise_id);
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-main border border-outline">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                            ✓
                                        </span>
                                        <span className="text-sm font-medium">{ex?.name || `Exercise ${res.exercise_id}`}</span>
                                    </div>
                                    <span className="badge-success">{res.reps} reps</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleFinishSession} disabled={submitting} className="btn-primary flex items-center gap-2">
                            {submitting ? (
                                <>
                                    <Spinner /> Saving…
                                </>
                            ) : (
                                "Save Session Results"
                            )}
                        </button>
                        <button onClick={() => router.push("/dashboard")} className="btn-outline">
                            Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Pre-session screen
    if (!sessionStarted) {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title text-3xl md:text-4xl">Exercise Session</h1>
                    <p className="text-sm text-muted">Follow along with instructional videos</p>
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
                            <p className="text-xs text-muted">{totalExercises} exercises with video comparison</p>
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
                                        {ex.description && (
                                            <span className="text-xs text-muted">{ex.description}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="badge-info">{ex.reps_nr} reps</span>
                                    <span className="badge-warning">{ex.sets_nr} sets</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-3 pt-2">
                        <p className="text-xs text-muted text-center max-w-md">
                            Your camera will be used to compare your movements with the instructional video in real-time using AI pose detection.
                        </p>
                        <button onClick={handleStartSession} className="btn-primary text-lg px-10 py-4 flex items-center gap-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active session with PoseDetector
    const videoUrl = currentExercise.video_url;

    return (
        <div className="page-container">
            {/* Exercise header */}
            <div className="w-full max-w-7xl animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center text-purple-400 font-bold text-lg">
                                {currentIndex + 1}
                            </span>
                            <span className="text-sm text-muted font-mono">/ {totalExercises}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{currentExercise.name}</h2>
                            {currentExercise.description && (
                                <p className="text-xs text-muted mt-0.5">{currentExercise.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="badge-info">{currentExercise.reps_nr} reps</span>
                        <span className="badge-warning">{currentExercise.sets_nr} sets</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-panel border border-outline rounded-full overflow-hidden mb-6">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${((currentIndex + 1) / totalExercises) * 100}%` }}
                    />
                </div>
            </div>

            {/* PoseDetector with reference video */}
            <PoseDetector referenceVideoUrl={videoUrl} />

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-4 animate-fade-in">
                {currentIndex + 1 < totalExercises ? (
                    <button onClick={handleNextExercise} className="btn-primary flex items-center gap-2 text-base px-8 py-3">
                        Next Exercise
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                ) : (
                    <button onClick={handleNextExercise} className="btn-primary flex items-center gap-2 text-base px-8 py-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Finish Session
                    </button>
                )}
                <button
                    onClick={() => {
                        if (confirm("Are you sure you want to cancel the session?")) {
                            setSessionStarted(false);
                        }
                    }}
                    className="btn-outline"
                >
                    Cancel
                </button>
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
