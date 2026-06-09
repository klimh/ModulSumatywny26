"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePhysio } from "@/hooks/usePhysio";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function ExercisesPage() {
    const { user, loading: authLoading } = useAuth();
    const { exercises, loading, error, fetchExercises, addExercise, uploadVideo, deleteVideo } = usePhysio();
    const router = useRouter();
    const { t } = useTranslation();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", body_part: "" });
    const [formError, setFormError] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);
    const [previewVideo, setPreviewVideo] = useState(null);
    const fileInputRefs = useRef({});

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

    const handleVideoUpload = async (exerciseId, file) => {
        if (!file) return;
        setUploadingId(exerciseId);
        try {
            await uploadVideo(exerciseId, file);
        } catch (err) {
            // error
        } finally {
            setUploadingId(null);
        }
    };

    const handleVideoDelete = async (exerciseId) => {
        if (!confirm(t('dashboard.exercises.deleteConfirm'))) return;
        setUploadingId(exerciseId);
        try {
            await deleteVideo(exerciseId);
            if (previewVideo === exerciseId) setPreviewVideo(null);
        } catch (err) {
            // error
        } finally {
            setUploadingId(null);
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
                <h1 className="page-title text-3xl md:text-4xl">{t('dashboard.exercises.title')}</h1>
                <p className="text-sm text-muted">{t('dashboard.exercises.desc')}</p>
            </div>

            <div className="w-full max-w-3xl flex flex-col gap-6 animate-fade-in">
                {error && <div className="error-box">{error}</div>}

                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">
                        {exercises.length === 1 ? t('dashboard.exercises.totalOne') : t('dashboard.exercises.total').replace('{n}', exercises.length)}
                    </span>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={showForm ? "btn-outline" : "btn-primary"}
                    >
                        {showForm ? t('dashboard.exercises.cancel') : t('dashboard.exercises.add')}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleAddExercise} className="card p-6 flex flex-col gap-4 animate-fade-in">
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
                            {t('dashboard.exercises.new')}
                        </h3>

                        {formError && <div className="error-box">{formError}</div>}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-name" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('dashboard.exercises.name')}
                            </label>
                            <input
                                id="ex-name"
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('dashboard.exercises.namePlaceholder')}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-body-part" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('dashboard.exercises.bodyPart')}
                            </label>
                            <input
                                id="ex-body-part"
                                type="text"
                                value={form.body_part}
                                onChange={(e) => setForm(prev => ({ ...prev, body_part: e.target.value }))}
                                placeholder={t('dashboard.exercises.bodyPartPlaceholder')}
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="ex-desc" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('dashboard.exercises.description')}
                            </label>
                            <textarea
                                id="ex-desc"
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('dashboard.exercises.descPlaceholder')}
                                rows={3}
                                className="input-field resize-none"
                            />
                        </div>

                        <button type="submit" disabled={formLoading} className="btn-primary w-fit flex items-center gap-2">
                            {formLoading ? <><Spinner /> {t('dashboard.exercises.saving')}</> : t('dashboard.exercises.save')}
                        </button>
                    </form>
                )}

                {exercises.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {exercises.map((ex, i) => (
                            <div key={ex.exercise_id || i} className="card p-5 flex flex-col gap-3">
                                <div className="flex items-start gap-4">
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

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {ex.video_url ? (
                                            <>
                                                <button
                                                    onClick={() => setPreviewVideo(previewVideo === ex.exercise_id ? null : ex.exercise_id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                                                    title="Preview video"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {previewVideo === ex.exercise_id ? t('dashboard.exercises.hide') : t('dashboard.exercises.video')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        fileInputRefs.current[ex.exercise_id]?.click();
                                                    }}
                                                    disabled={uploadingId === ex.exercise_id}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all duration-300 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Change video"
                                                >
                                                    {uploadingId === ex.exercise_id ? (
                                                        <><Spinner /> {t('dashboard.exercises.uploading')}</>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            {t('dashboard.exercises.changeVideo')}
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    fileInputRefs.current[ex.exercise_id]?.click();
                                                }}
                                                disabled={uploadingId === ex.exercise_id}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-400 border border-dashed border-purple-500/40 hover:bg-purple-500/25 hover:border-purple-500 transition-all duration-300 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {uploadingId === ex.exercise_id ? (
                                                    <><Spinner /> {t('dashboard.exercises.uploading')}</>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        {t('dashboard.exercises.addVideo')}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                            ref={(el) => { fileInputRefs.current[ex.exercise_id] = el; }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleVideoUpload(ex.exercise_id, file);
                                                e.target.value = "";
                                            }}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                {previewVideo === ex.exercise_id && ex.video_url && (
                                    <div className="animate-fade-in rounded-xl overflow-hidden border border-outline bg-black/20">
                                        <video
                                            src={ex.video_url}
                                            controls
                                            className="w-full max-h-80 object-contain"
                                            preload="metadata"
                                        />
                                    </div>
                                )}
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
                        <h3 className="text-lg font-semibold">{t('dashboard.exercises.emptyTitle')}</h3>
                        <p className="text-sm text-muted text-center max-w-sm">
                            {t('dashboard.exercises.emptyDesc')}
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
