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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const specializationOptions = [
        { value: "", label: t('dashboard.findPhysio.specSystem') },
        { value: "Ortopedia", label: t('dashboard.findPhysio.specOrto') },
        { value: "Neurologia", label: t('dashboard.findPhysio.specNeuro') },
        { value: "Sport", label: t('dashboard.findPhysio.specSport') },
        { value: "Pediatria", label: t('dashboard.findPhysio.specPed') },
    ];

    const currentSpecializationLabel = specializationOptions.find(opt => opt.value === specialization)?.label || t('dashboard.findPhysio.specSystem');
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
            setSuccessMessage(t('dashboard.findPhysio.requestSent'));
        } catch (err) {
            setActionError(err.message || t('dashboard.findPhysio.error'));
        }
    };

    const handleConfirm = async (requestId) => {
        setActionError("");
        setSuccessMessage("");
        try {
            await confirmPairing(requestId);
            setSuccessMessage(t('dashboard.findPhysio.pairingConfirmed'));
        } catch (err) {
            setActionError(err.message || t('dashboard.findPhysio.errorConfirm'));
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
                        <h3 className="text-xl font-bold">{t('dashboard.findPhysio.alreadyAssignedTitle')}</h3>
                        <p className="text-muted">{t('dashboard.findPhysio.yourPhysioIs')} {physio.first_name} {physio.last_name}</p>
                        <Link href="/dashboard" className="btn-primary mt-4">
                            {t('dashboard.findPhysio.backToDashboard')}
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
                        <h3 className="text-xl font-bold text-amber-400">{t('dashboard.findPhysio.waitingTitle')}</h3>
                        <p className="text-muted text-sm">
                            {t('dashboard.findPhysio.waitingDesc')} <strong className="text-white">{pairingStatus.physio_name}</strong> {t('dashboard.findPhysio.waitingDescSuffix')}
                        </p>
                        <div className="bg-panel w-full p-4 rounded-lg mt-2 text-left">
                            <span className="text-xs text-muted uppercase">{t('dashboard.findPhysio.yourProblem')}</span>
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
                        <h3 className="text-xl font-bold text-emerald-400">{t('dashboard.findPhysio.matchFound')}</h3>
                        <p className="text-muted text-sm">
                            {t('dashboard.findPhysio.matchDesc')} <strong className="text-white">{pairingStatus.physio_name}</strong> {t('dashboard.findPhysio.matchDescSuffix')}
                        </p>
                        <button 
                            onClick={() => handleConfirm(pairingStatus.id)}
                            disabled={loading}
                            className="btn-primary mt-4 w-full"
                        >
                            {loading ? <Spinner /> : t('dashboard.findPhysio.confirmBtn')}
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
                    {t('dashboard.findPhysio.formSubtitle')}
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
                            {t('dashboard.findPhysio.problemLabel')} <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            required
                            maxLength={500}
                            placeholder={t('dashboard.findPhysio.problemPlaceholder')}
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            className="input-field min-h-[120px] py-3 resize-y"
                        />
                        <div className="text-xs text-right text-muted">{problemDescription.length}/500</div>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                        <label className="text-sm font-medium text-gray-200">
                            {t('dashboard.findPhysio.specLabel')}
                        </label>
                        <div 
                            className="input-field py-3 text-gray-200 cursor-pointer flex justify-between items-center"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span>{currentSpecializationLabel}</span>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        
                        {isDropdownOpen && (
                            <div className="absolute top-[80px] left-0 w-full bg-[#1e1e24] border border-outline rounded-xl shadow-2xl z-10 overflow-hidden animate-fade-in">
                                {specializationOptions.map((opt) => (
                                    <div 
                                        key={opt.value}
                                        className={`px-4 py-3 cursor-pointer hover:bg-main transition-colors ${specialization === opt.value ? 'bg-main text-emerald-400 font-medium' : 'text-gray-200'}`}
                                        onClick={() => {
                                            setSpecialization(opt.value);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !problemDescription.trim()}
                        className="btn-primary mt-2 py-3"
                    >
                        {loading ? <Spinner /> : t('dashboard.findPhysio.findBtn')}
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
