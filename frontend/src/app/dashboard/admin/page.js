"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

export default function AdminDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState("physios");

    const [physios, setPhysios] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState("");
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        specialization: "",
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
        if (!authLoading && user && user.role !== "admin") {
            router.push("/dashboard");
        }
    }, [user, authLoading, router]);

    const fetchPhysios = async () => {
        try {
            const data = await api.admin.getPhysiotherapists();
            setPhysios(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchCertificates = async () => {
        try {
            const data = await api.admin.getCertificates();
            setCertificates(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchPhysios(), fetchCertificates()]);
        setLoading(false);
    };

    useEffect(() => {
        if (user?.role === "admin") {
            fetchData();
        }
    }, [user]);

    const updateField = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError(null);
        setSuccess("");
        try {
            await api.admin.createPhysio(form);
            setSuccess(t('dashboard.admin.createdSuccess').replace('{name}', `${form.first_name} ${form.last_name}`));
            setForm({ first_name: "", last_name: "", email: "", password: "", specialization: "" });
            setShowForm(false);
            fetchPhysios();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (userId, name) => {
        if (!window.confirm(t('dashboard.admin.deleteConfirm').replace('{name}', name))) return;
        setError(null);
        setSuccess("");
        try {
            await api.admin.deletePhysio(userId);
            setSuccess(t('dashboard.admin.deleteSuccess').replace('{name}', name));
            fetchPhysios();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVerify = async (id, verify) => {
        setError(null);
        setSuccess("");
        try {
            await api.admin.verifyCertificate(id, verify);
            fetchCertificates();
        } catch (err) {
            setError(err.message);
        }
    };

    if (authLoading) {
        return (
            <div className="page-container justify-center items-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user || user.role !== "admin") return null;

    return (
        <div className="page-container">
            <div className="flex flex-col items-center gap-2 animate-scale-up">
                <h1 className="page-title">{t('dashboard.admin.title')}</h1>
                <p className="text-sm text-muted font-mono">
                    {t('dashboard.admin.desc')}
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
                {success && <div className="success-box">✓ {success}</div>}
                {error && <div className="error-box">⚠️ {error}</div>}

                <div className="flex gap-4 border-b border-outline/50">
                    <button
                        className={`pb-2 px-4 font-semibold ${activeTab === 'physios' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-muted'}`}
                        onClick={() => setActiveTab('physios')}
                    >
                        {t('dashboard.admin.physios')}
                    </button>
                    <button
                        className={`pb-2 px-4 font-semibold ${activeTab === 'certificates' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted'}`}
                        onClick={() => setActiveTab('certificates')}
                    >
                        {t('dashboard.admin.certificates')}
                    </button>
                </div>

                {loading && (
                    <div className="flex justify-center py-8">
                        <Spinner size="lg" />
                    </div>
                )}

                {activeTab === 'physios' && !loading && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-violet-400">{physios.length}</span>
                                    <p className="text-xs text-muted">{t('dashboard.admin.physios')}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="btn-primary flex items-center gap-2"
                                id="toggle-add-physio-form"
                            >
                                {showForm ? (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {t('dashboard.admin.cancel')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        {t('dashboard.admin.add')}
                                    </>
                                )}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleCreate} className="card p-8 flex flex-col gap-5 animate-fade-in">
                                <h2 className="section-title text-left">{t('dashboard.admin.newTitle')}</h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="physio-first-name" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                            {t('dashboard.admin.firstName')}
                                        </label>
                                        <input
                                            id="physio-first-name"
                                            type="text"
                                            value={form.first_name}
                                            onChange={updateField("first_name")}
                                            placeholder={t('dashboard.admin.firstNamePlaceholder')}
                                            required
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="physio-last-name" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                            {t('dashboard.admin.lastName')}
                                        </label>
                                        <input
                                            id="physio-last-name"
                                            type="text"
                                            value={form.last_name}
                                            onChange={updateField("last_name")}
                                            placeholder={t('dashboard.admin.lastNamePlaceholder')}
                                            required
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="physio-email" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                        {t('dashboard.admin.email')}
                                    </label>
                                    <input
                                        id="physio-email"
                                        type="email"
                                        value={form.email}
                                        onChange={updateField("email")}
                                        placeholder={t('dashboard.admin.emailPlaceholder')}
                                        required
                                        className="input-field"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="physio-password" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                        {t('dashboard.admin.password')}
                                    </label>
                                    <input
                                        id="physio-password"
                                        type="password"
                                        value={form.password}
                                        onChange={updateField("password")}
                                        placeholder={t('dashboard.admin.passwordPlaceholder')}
                                        required
                                        className="input-field"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="physio-specialization" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                        {t('dashboard.admin.specialization')}
                                    </label>
                                    <input
                                        id="physio-specialization"
                                        type="text"
                                        value={form.specialization}
                                        onChange={updateField("specialization")}
                                        placeholder={t('dashboard.admin.specializationPlaceholder')}
                                        className="input-field"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {formLoading ? (
                                        <>
                                            <Spinner />
                                            {t('dashboard.admin.creating')}
                                        </>
                                    ) : (
                                        t('dashboard.admin.createBtn')
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="flex flex-col gap-3">
                            <h2 className="section-title text-left">{t('dashboard.admin.registeredTitle')}</h2>

                            {physios.length === 0 && (
                                <div className="card p-8 text-center">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-muted">{t('dashboard.admin.noPhysios')}</p>
                                </div>
                            )}

                            {physios.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {physios.map((physio) => (
                                        <div key={physio.user_id} className="card-hover p-5 flex flex-col gap-3 text-left">
                                            <div className="flex items-start justify-between">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-lg font-bold text-emerald-400">
                                                    {physio.first_name[0]}{physio.last_name[0]}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(physio.user_id, `${physio.first_name} ${physio.last_name}`)}
                                                    className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    title="Delete physiotherapist"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-base leading-tight">
                                                    {physio.first_name} {physio.last_name}
                                                </h3>
                                                <p className="text-xs text-muted mt-1">{physio.email}</p>
                                            </div>
                                            <span className="badge-success w-fit text-xs">{t('dashboard.admin.badge')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'certificates' && !loading && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-cyan-400">{certificates.length}</span>
                                    <p className="text-xs text-muted">{t('dashboard.admin.certificates')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {certificates.length === 0 ? (
                                <div className="card p-8 text-center">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-muted">Brak przesłanych certyfikatów.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {certificates.map(cert => {
                                        const physio = physios.find(p => p.user_id === cert.physio_id);
                                        const physioName = physio ? `${physio.first_name} ${physio.last_name}` : `Physio ID: ${cert.physio_id}`;

                                        return (
                                            <div key={cert.certificate_id} className="card p-4 flex flex-col gap-3 border-l-4" style={{ borderLeftColor: cert.is_verified ? '#10b981' : '#f59e0b' }}>
                                                <div>
                                                    <h4 className="font-semibold text-lg">{cert.name}</h4>
                                                    <p className="text-xs text-muted mt-1">{physioName}</p>
                                                </div>
                                                <button onClick={() => setSelectedCertificate(cert.file_url)} className="text-blue-400 hover:underline text-sm flex items-center gap-1 w-fit">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    {t('dashboard.certificates.viewCertificate')}
                                                </button>
                                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline/50">
                                                    <span className={`text-xs font-mono px-2 py-1 rounded-full ${cert.is_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {cert.is_verified ? t('dashboard.certificates.verified') : t('dashboard.certificates.unverified')}
                                                    </span>
                                                    <button
                                                        onClick={() => handleVerify(cert.certificate_id, !cert.is_verified)}
                                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${cert.is_verified ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                                    >
                                                        {cert.is_verified ? t('dashboard.admin.unverify') : t('dashboard.admin.verify')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
