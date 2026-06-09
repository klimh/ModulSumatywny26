"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function RegisterPage() {
    const { register, loading, error } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState(null);
    const [success, setSuccess] = useState(false);

    const updateField = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (form.password !== confirmPassword) {
            setLocalError(t('register.error.mismatch'));
            return;
        }

        if (form.password.length < 6) {
            setLocalError(t('register.error.length'));
            return;
        }

        try {
            await register(form);
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err) {
            setLocalError(err.message);
        }
    };

    const displayError = localError || error;

    return (
        <div className="page-container justify-center">
            <div className="w-full max-w-md flex flex-col gap-6 animate-scale-up">

                <div className="flex flex-col items-center gap-2">
                    <h1 className="page-title text-3xl md:text-4xl">{t('register.title')}</h1>
                    <p className="text-sm text-muted">
                        {t('register.subtitle')}
                    </p>
                </div>

                {success ? (
                    <div className="card p-8 flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold">{t('register.success.title')}</h2>
                        <p className="text-sm text-muted">{t('register.success.desc')}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
                        {displayError && (
                            <div className="error-box">⚠️ {displayError}</div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="first-name" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                    {t('register.firstNameLabel')}
                                </label>
                                <input
                                    id="first-name"
                                    type="text"
                                    value={form.first_name}
                                    onChange={updateField("first_name")}
                                    placeholder={t('register.firstNamePlaceholder')}
                                    required
                                    className="input-field"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="last-name" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                    {t('register.lastNameLabel')}
                                </label>
                                <input
                                    id="last-name"
                                    type="text"
                                    value={form.last_name}
                                    onChange={updateField("last_name")}
                                    placeholder={t('register.lastNamePlaceholder')}
                                    required
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="register-email" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('register.emailLabel')}
                            </label>
                            <input
                                id="register-email"
                                type="email"
                                value={form.email}
                                onChange={updateField("email")}
                                placeholder={t('register.emailPlaceholder')}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="register-password" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('register.passwordLabel')}
                            </label>
                            <input
                                id="register-password"
                                type="password"
                                value={form.password}
                                onChange={updateField("password")}
                                placeholder={t('register.passwordPlaceholder')}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="confirm-password" className="text-xs font-semibold text-muted uppercase tracking-wider">
                                {t('register.confirmPasswordLabel')}
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('register.confirmPasswordPlaceholder')}
                                required
                                className="input-field"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    {t('register.submitting')}
                                </>
                            ) : (
                                t('register.submit')
                            )}
                        </button>

                        <p className="text-center text-sm text-muted">
                            {t('register.hasAccount')}{" "}
                            <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
                                {t('register.signIn')}
                            </Link>
                        </p>
                    </form>
                )}
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
