"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function FindPhysioPage() {
    const { user, loading: authLoading } = useAuth();
    const { 
        physio, 
        pairingStatus, 
        loading, 
        error, 
        fetchMyPhysio, 
        fetchPairingStatus, 
        requestPairing,
        confirmPairing
    } = usePatient();
    
    const { t } = useTranslation();
    const router = useRouter();

    const [problemDescription, setProblemDescription] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "pacjent") {
            fetchMyPhysio();
            fetchPairingStatus();
        }
    }, [user, fetchMyPhysio, fetchPairingStatus]);

    const handleRequestPairing = async (e) => {
        e.preventDefault();
        setActionError("");
        setSuccessMessage("");
        try {
            await requestPairing({
                problem_description: problemDescription,
                required_specialization: specialization || null
            });
            setSuccessMessage("Wysłano zapytanie do systemu. Szukamy specjalisty...");
        } catch (err) {
            setActionError(err.message || "Wystąpił błąd");
        }
    };

    const handleConfirm = async (requestId) => {
        setActionError("");
        setSuccessMessage("");
        try {
            await confirmPairing(requestId);
            setSuccessMessage("Współpraca zatwierdzona! Zobaczysz swojego fizjoterapeutę w panelu głównym.");
        } catch (err) {
            setActionError(err.message || "Wystąpił błąd podczas akceptacji");
        }
    };

    if (authLoading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user || user.role !== "pacjent") return null;

    if (physio && physio.status === "ZAAKCEPTOWANE") {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title">{t('dashboard.findPhysio.title')}</h1>
                </div>
                <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in mt-8">
                    <div className="card p-8 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold">Masz już przypisanego fizjoterapeutę!</h3>
                        <p className="text-muted">Twój fizjoterapeuta to: {physio.first_name} {physio.last_name}</p>
                        <Link href="/dashboard" className="btn-primary mt-4">
                            Wróć do panelu
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (pairingStatus && pairingStatus.status === "PENDING") {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title">{t('dashboard.findPhysio.title')}</h1>
                </div>
                <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in mt-8 mx-auto">
                    <div className="card p-8 text-center flex flex-col items-center gap-4 border-amber-500/30 bg-amber-500/5">
                        <Spinner size="lg" className="text-amber-400 mb-2" />
                        <h3 className="text-xl font-bold text-amber-400">Oczekiwanie na fizjoterapeutę</h3>
                        <p className="text-muted text-sm">
                            System przydzielił Twoje zapytanie. Czekamy, aż fizjoterapeuta <strong className="text-white">{pairingStatus.physio_name}</strong> zaakceptuje prośbę.
                        </p>
                        <div className="bg-panel w-full p-4 rounded-lg mt-2 text-left">
                            <span className="text-xs text-muted uppercase">Twój problem:</span>
                            <p className="text-sm text-gray-200 mt-1">{pairingStatus.problem_description}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (pairingStatus && pairingStatus.status === "ACCEPTED_BY_PHYSIO") {
        return (
            <div className="page-container">
                <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <h1 className="page-title">{t('dashboard.findPhysio.title')}</h1>
                </div>
                <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in mt-8 mx-auto">
                    {successMessage && <div className="success-box">✓ {successMessage}</div>}
                    {actionError && <div className="error-box">⚠️ {actionError}</div>}
                    <div className="card p-8 text-center flex flex-col items-center gap-4 border-emerald-500/30 bg-emerald-500/5">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 animate-pulse">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-emerald-400">Mamy to!</h3>
                        <p className="text-muted text-sm">
                            Fizjoterapeuta <strong className="text-white">{pairingStatus.physio_name}</strong> zapoznał się z Twoim problemem i zgodził się podjąć współpracy.
                        </p>
                        <button 
                            onClick={() => handleConfirm(pairingStatus.id)}
                            disabled={loading}
                            className="btn-primary mt-4 w-full"
                        >
                            {loading ? <Spinner /> : "Potwierdź współpracę"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">{t('dashboard.findPhysio.title')}</h1>
                <p className="text-sm text-muted font-mono">
                    Opisz swój problem, a nasz algorytm dopasuje do Ciebie najlepszego specjalistę.
                </p>
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in mt-4 mx-auto">
                <Link href="/dashboard" className="btn-ghost no-underline w-fit flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('dashboard.findPhysio.backToDashboard')}
                </Link>

                {successMessage && <div className="success-box">✓ {successMessage}</div>}
                {actionError && <div className="error-box">⚠️ {actionError}</div>}
                {error && <div className="error-box">⚠️ {error}</div>}

                <form onSubmit={handleRequestPairing} className="card p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-200">
                            Opisz z czym masz problem <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            required
                            maxLength={500}
                            placeholder="Napisz krótko co Ci dolega, np. ból dolnego odcinka kręgosłupa przy schylaniu..."
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            className="input-field min-h-[120px] py-3 resize-y"
                        />
                        <div className="text-xs text-right text-muted">{problemDescription.length}/500</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-200">
                            Preferowana specjalizacja (Opcjonalnie)
                        </label>
                        <select 
                            className="input-field py-3 text-gray-200"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                        >
                            <option value="">Wybierze system (Zalecane)</option>
                            <option value="Ortopedia">Ortopedia</option>
                            <option value="Neurologia">Neurologia</option>
                            <option value="Sport">Sportowa</option>
                            <option value="Pediatria">Pediatria</option>
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !problemDescription.trim()}
                        className="btn-primary mt-2 py-3"
                    >
                        {loading ? <Spinner /> : "Znajdź mi fizjoterapeutę"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function Spinner({ size = "sm", className = "" }) {
    const dim = size === "lg" ? "w-8 h-8" : "w-4 h-4";
    return (
        <svg className={`${dim} spinner ${className}`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}
