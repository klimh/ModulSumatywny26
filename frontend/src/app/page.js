"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

export default function Home() {
    const { user } = useAuth();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center gap-12 py-20 px-4 w-full max-w-5xl">
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30 mb-2">
                    <span className="text-white font-black text-3xl">R</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-center">
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        RehabSense
                    </span>
                </h1>
                <p className="font-mono font-light text-muted text-lg text-center max-w-xl">
                    {t('home.subtitle')}
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 animate-scale-up">
                {user ? (
                    <Link href="/dashboard" className="btn-primary text-center no-underline">
                        {t('home.goToDashboard')}
                    </Link>
                ) : (
                    <>
                        <Link href="/register" className="btn-primary text-center no-underline">
                            {t('home.getStarted')}
                        </Link>
                        <Link href="/login" className="btn-outline text-center no-underline">
                            {t('home.signIn')}
                        </Link>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full animate-scale-up" style={{ animationDelay: "0.15s" }}>
                <div className="card-hover p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg">{t('home.features.pose.title')}</span>
                    <span className="text-xs text-muted">
                        {t('home.features.pose.desc')}
                    </span>
                </div>

                <div className="card-hover p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg">{t('home.features.plans.title')}</span>
                    <span className="text-xs text-muted">
                        {t('home.features.plans.desc')}
                    </span>
                </div>

                <div className="card-hover p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg">{t('home.features.progress.title')}</span>
                    <span className="text-xs text-muted">
                        {t('home.features.progress.desc')}
                    </span>
                </div>
            </div>
        </div>
    );
}
