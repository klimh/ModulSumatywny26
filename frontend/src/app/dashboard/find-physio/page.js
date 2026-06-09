"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function FindPhysioPage() {
    const { user, loading: authLoading } = useAuth();
    const { allPhysios, loading, error, fetchAllPhysios, requestPhysio } = usePatient();
    const { t } = useTranslation();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [requestingId, setRequestingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [requestError, setRequestError] = useState("");
    const [selectedPhysio, setSelectedPhysio] = useState(null);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user?.role === "pacjent") {
            fetchAllPhysios();
        }
    }, [user, fetchAllPhysios]);

    const handleRequest = async (physioId) => {
        setRequestingId(physioId);
        setSuccessMessage("");
        setRequestError("");
        try {
            await requestPhysio(physioId);
            setSuccessMessage(t('dashboard.findPhysio.success'));
        } catch (err) {
            setRequestError(err.message);
        } finally {
            setRequestingId(null);
        }
    };

    const filteredPhysios = allPhysios.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
            p.first_name.toLowerCase().includes(query) ||
            p.last_name.toLowerCase().includes(query) ||
            (p.specialization && p.specialization.toLowerCase().includes(query))
        );
    });

    if (authLoading) {
        return (
            <div className="page-container justify-center items-center">
                <svg className="w-8 h-8 spinner" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (!user || user.role !== "pacjent") return null;

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">{t('dashboard.findPhysio.title')}</h1>
                <p className="text-sm text-muted font-mono">
                    {t('dashboard.findPhysio.subtitle')}
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
                <Link href="/dashboard" className="btn-ghost no-underline w-fit flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('dashboard.findPhysio.backToDashboard')}
                </Link>

                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder={t('dashboard.findPhysio.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-12"
                        id="search-physio-input"
                    />
                </div>

                {successMessage && <div className="success-box">✓ {successMessage}</div>}
                {requestError && <div className="error-box">⚠️ {requestError}</div>}
                {error && <div className="error-box">⚠️ {error}</div>}

                {loading && (
                    <div className="flex justify-center py-12">
                        <svg className="w-8 h-8 spinner text-muted" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {!loading && filteredPhysios.length === 0 && (
                    <div className="card p-8 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-muted">
                            {searchQuery ? t('dashboard.findPhysio.noMatch') : t('dashboard.findPhysio.noAvailable')}
                        </p>
                    </div>
                )}

                {!loading && filteredPhysios.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPhysios.map((physio) => (
                            <div
                                key={physio.user_id}
                                className="card-hover p-6 flex flex-col gap-3 text-left cursor-pointer"
                                onClick={() => setSelectedPhysio(physio)}
                            >
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-xl font-bold text-violet-400">
                                    {physio.first_name[0]}{physio.last_name[0]}
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg leading-tight">
                                        {physio.first_name} {physio.last_name}
                                    </h3>
                                    <p className="text-xs text-muted mt-1">{physio.email}</p>
                                </div>

                                {physio.specialization && (
                                    <span className="badge-info w-fit">
                                        {physio.specialization}
                                    </span>
                                )}



                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRequest(physio.user_id);
                                    }}
                                    disabled={requestingId === physio.user_id}
                                    className="btn-primary mt-auto text-sm"
                                    id={`request-physio-${physio.user_id}`}
                                >
                                    {requestingId === physio.user_id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 spinner" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {t('dashboard.findPhysio.sending')}
                                        </span>
                                    ) : (
                                        t('dashboard.findPhysio.sendRequest')
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedPhysio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedPhysio(null)}>
                    <div className="bg-panel border border-outline/50 rounded-2xl p-6 max-w-md w-full flex flex-col gap-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-2xl font-bold text-violet-400">
                                    {selectedPhysio.first_name[0]}{selectedPhysio.last_name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl leading-tight">
                                        {selectedPhysio.first_name} {selectedPhysio.last_name}
                                    </h3>
                                    <p className="text-sm text-muted mt-0.5">{selectedPhysio.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPhysio(null)} className="text-muted hover:text-white p-1">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {selectedPhysio.specialization && (
                            <div>
                                <span className="badge-info text-sm">
                                    Specjalizacja: {selectedPhysio.specialization}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg w-fit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Ilość pacjentów: <strong className="font-bold">{selectedPhysio.patient_count || 0}</strong></span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h4 className="font-semibold text-white/90 border-b border-outline/50 pb-1">{t('dashboard.admin.certificates')}</h4>
                            {selectedPhysio.certificates && selectedPhysio.certificates.length > 0 ? (
                                <div className="flex flex-col gap-2 mt-1 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedPhysio.certificates.map(cert => (
                                        <div key={cert.certificate_id} className="flex flex-col gap-2 text-sm bg-panel/80 border border-outline/50 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 text-gray-200 font-medium">
                                                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>{cert.name}</span>
                                                </div>
                                                {cert.is_verified && (
                                                    <span title={t('dashboard.certificates.verified')} className="flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Zweryfikowany
                                                    </span>
                                                )}
                                            </div>
                                            <button onClick={() => setSelectedCertificate(cert.file_url)} className="text-blue-400 hover:text-blue-300 hover:underline text-xs flex items-center gap-1 w-fit ml-6">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                {t('dashboard.certificates.viewCertificate')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted italic mt-1">Brak certyfikatów.</p>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                handleRequest(selectedPhysio.user_id);
                                setSelectedPhysio(null);
                            }}
                            disabled={requestingId === selectedPhysio.user_id}
                            className="btn-primary mt-2"
                        >
                            {t('dashboard.findPhysio.sendRequest')}
                        </button>
                    </div>
                </div>
            )}

            {selectedCertificate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCertificate(null)}>
                    <div className="relative bg-panel border border-outline/50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-outline/50">
                            <h3 className="font-semibold text-lg text-white">{t('dashboard.certificates.preview')}</h3>
                            <button onClick={() => setSelectedCertificate(null)} className="text-muted hover:text-white p-1 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-hidden flex items-center justify-center min-h-[50vh]">
                            {selectedCertificate.toLowerCase().endsWith('.pdf') || selectedCertificate.includes('/raw/') ? (
                                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedCertificate)}&embedded=true`} className="w-full h-[70vh] rounded-lg bg-white" title="Certificate PDF preview" />
                            ) : (
                                <img src={selectedCertificate} alt="Certificate preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
