"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function LoginPage() {
    const { login, loading, error } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        try {
            const user = await login(email, password);
            router.push("/dashboard");
        } catch (err) {
            setLocalError(err.message);
        }
    };

    const displayError = localError || error;

    return (
        <div className="page-container justify-center">
            <div className="w-full max-w-md flex flex-col gap-6 animate-scale-up">

                <div className="flex flex-col items-center gap-2">
                    <h1 className="page-title text-3xl md:text-4xl">{t('login.title')}</h1>
                    <p className="text-sm text-muted">
                        {t('login.subtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
                    {displayError && (
                        <div className="error-box">⚠️ {displayError}</div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label htmlFor="email" className="text-xs font-semibold text-muted uppercase tracking-wider">
                            {t('login.emailLabel')}
                        </label>
                        <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="password" className="text-xs font-semibold text-muted uppercase tracking-wider">
                            {t('login.passwordLabel')}
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.passwordPlaceholder')}
                            required
                            className="input-field"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={mounted ? loading : false}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {mounted && loading ? (
                            <>
                                <Spinner />
                                {t('login.submitting')}
                            </>
                        ) : (
                            t('login.submit')
                        )}
                    </button>

                    <p className="text-center text-sm text-muted">
                        {t('login.noAccount')}{" "}
                        <Link href="/register" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
                            {t('login.createAccount')}
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="w-4 h-4 spinner" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}
