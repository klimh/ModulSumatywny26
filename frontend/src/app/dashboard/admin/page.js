"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [physios, setPhysios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState("");

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
        setLoading(true);
        setError(null);
        try {
            const data = await api.admin.getPhysiotherapists();
            setPhysios(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === "admin") {
            fetchPhysios();
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
            setSuccess(`Physiotherapist ${form.first_name} ${form.last_name} created successfully!`);
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
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        setError(null);
        setSuccess("");
        try {
            await api.admin.deletePhysio(userId);
            setSuccess(`${name} has been removed.`);
            fetchPhysios();
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
                <h1 className="page-title">Admin Panel</h1>
                <p className="text-sm text-muted font-mono">
                    Manage physiotherapists and system settings
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
                {/* Status messages */}
                {success && <div className="success-box">✓ {success}</div>}
                {error && <div className="error-box">⚠️ {error}</div>}

                {/* Stats + Add button */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="card p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-2xl font-black text-violet-400">{physios.length}</span>
                            <p className="text-xs text-muted">Physiotherapists</p>
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
                                Cancel
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Physiotherapist
                            </>
                        )}
                    </button>
                </div>

                {/* Create form */}
                {showForm && (
                    <form onSubmit={handleCreate} className="card p-8 flex flex-col gap-5 animate-fade-in">
                        <h2 className="section-title text-left">New Physiotherapist</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="physio-first-name" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                    First Name
                                </label>
                                <input
                                    id="physio-first-name"
                                    type="text"
                                    value={form.first_name}
                                    onChange={updateField("first_name")}
                                    placeholder="Jan"
                                    required
                                    className="input-field"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="physio-last-name" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                    Last Name
                                </label>
                                <input
                                    id="physio-last-name"
                                    type="text"
                                    value={form.last_name}
                                    onChange={updateField("last_name")}
                                    placeholder="Kowalski"
                                    required
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="physio-email" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                Email Address
                            </label>
                            <input
                                id="physio-email"
                                type="email"
                                value={form.email}
                                onChange={updateField("email")}
                                placeholder="jan.kowalski@email.com"
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="physio-password" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                Password
                            </label>
                            <input
                                id="physio-password"
                                type="password"
                                value={form.password}
                                onChange={updateField("password")}
                                placeholder="••••••••"
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="physio-specialization" className="text-xs font-semibold text-muted uppercase tracking-wider text-left">
                                Specialization (optional)
                            </label>
                            <input
                                id="physio-specialization"
                                type="text"
                                value={form.specialization}
                                onChange={updateField("specialization")}
                                placeholder="e.g. Ortopedia, Neurologia, Sport"
                                className="input-field"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            id="submit-create-physio"
                        >
                            {formLoading ? (
                                <>
                                    <Spinner />
                                    Creating…
                                </>
                            ) : (
                                "Create Physiotherapist Account"
                            )}
                        </button>
                    </form>
                )}

                {/* Physio list */}
                <div className="flex flex-col gap-3">
                    <h2 className="section-title text-left">Registered Physiotherapists</h2>

                    {loading && (
                        <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                        </div>
                    )}

                    {!loading && physios.length === 0 && (
                        <div className="card p-8 text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-muted">No physiotherapists registered yet. Add one using the button above.</p>
                        </div>
                    )}

                    {!loading && physios.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {physios.map((physio) => (
                                <div key={physio.user_id} className="card-hover p-5 flex flex-col gap-3 text-left">
                                    {/* Avatar */}
                                    <div className="flex items-start justify-between">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-lg font-bold text-emerald-400">
                                            {physio.first_name[0]}{physio.last_name[0]}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(physio.user_id, `${physio.first_name} ${physio.last_name}`)}
                                            className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Delete physiotherapist"
                                            id={`delete-physio-${physio.user_id}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <h3 className="font-semibold text-base leading-tight">
                                            {physio.first_name} {physio.last_name}
                                        </h3>
                                        <p className="text-xs text-muted mt-1">{physio.email}</p>
                                    </div>

                                    <span className="badge-success w-fit text-xs">Physiotherapist</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
