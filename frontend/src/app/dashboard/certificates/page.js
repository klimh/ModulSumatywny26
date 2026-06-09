"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export default function CertificatesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState("");
    const [file, setFile] = useState(null);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
        if (!authLoading && user && user.role !== "fizjoterapeuta") {
            router.push("/dashboard");
        }
    }, [user, authLoading, router]);

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const data = await api.physio.getCertificates();
            setCertificates(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.role === "fizjoterapeuta") {
            fetchCertificates();
        }
    }, [user]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!name || !file) return;

        setIsUploading(true);
        setError(null);
        try {
            await api.physio.uploadCertificate(name, file);
            setName("");
            setFile(null);
            // Reset the file input visually
            const fileInput = document.getElementById("cert-file-input");
            if (fileInput) fileInput.value = "";
            await fetchCertificates();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('dashboard.certificates.deleteConfirm'))) return;
        try {
            await api.physio.deleteCertificate(id);
            await fetchCertificates();
        } catch (err) {
            setError(err.message);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="page-container justify-center items-center">
                <svg className="w-8 h-8 spinner" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (!user || user.role !== "fizjoterapeuta") return null;

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">{t('dashboard.certificates.title')}</h1>
                <p className="text-sm text-muted font-mono">
                    {t('dashboard.certificates.desc')}
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
                <Link href="/dashboard" className="btn-ghost no-underline w-fit flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('dashboard.certificates.back')}
                </Link>

                {error && <div className="error-box">⚠️ {error}</div>}

                <div className="card p-6">
                    <h3 className="font-semibold text-lg mb-4">{t('dashboard.certificates.add')}</h3>
                    <form onSubmit={handleUpload} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-muted">{t('dashboard.certificates.name')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('dashboard.certificates.namePlaceholder')}
                                className="input-field"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-muted">{t('dashboard.certificates.file')}</label>
                            <input
                                id="cert-file-input"
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="input-field"
                                accept="image/jpeg,image/png,application/pdf"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-fit mt-2" disabled={isUploading}>
                            {isUploading ? t('dashboard.certificates.uploading') : t('dashboard.certificates.save')}
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certificates.length === 0 ? (
                        <div className="col-span-full card p-8 text-center text-muted">
                            {t('dashboard.certificates.emptyDesc')}
                        </div>
                    ) : (
                        certificates.map(cert => (
                            <div key={cert.certificate_id} className="card p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-semibold text-lg">{cert.name}</h4>
                                    <button onClick={() => handleDelete(cert.certificate_id)} className="text-red-400 hover:text-red-300 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline/50">
                                    <button onClick={() => setSelectedCertificate(cert.file_url)} className="text-blue-400 hover:underline text-sm flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {t('dashboard.certificates.viewCertificate')}
                                    </button>
                                    <span className={`text-xs font-mono px-2 py-1 rounded-full ${cert.is_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {cert.is_verified ? t('dashboard.certificates.verified') : t('dashboard.certificates.unverified')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

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
