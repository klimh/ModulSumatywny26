"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FindPhysioPage() {
    const { user, loading: authLoading } = useAuth();
    const { allPhysios, loading, error, fetchAllPhysios, requestPhysio } = usePatient();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [requestingId, setRequestingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [requestError, setRequestError] = useState("");

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
            setSuccessMessage("Request sent successfully! Your physiotherapist will review it shortly.");
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
                <h1 className="page-title">Find Physiotherapist</h1>
                <p className="text-sm text-muted font-mono">
                    Browse and connect with available physiotherapists
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
                {/* Back link */}
                <Link href="/dashboard" className="btn-ghost no-underline w-fit flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </Link>

                {/* Search bar */}
                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or specialization…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-12"
                        id="search-physio-input"
                    />
                </div>

                {/* Status messages */}
                {successMessage && <div className="success-box">✓ {successMessage}</div>}
                {requestError && <div className="error-box">⚠️ {requestError}</div>}
                {error && <div className="error-box">⚠️ {error}</div>}

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <svg className="w-8 h-8 spinner text-muted" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {/* Physio list */}
                {!loading && filteredPhysios.length === 0 && (
                    <div className="card p-8 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-muted">
                            {searchQuery ? "No physiotherapists match your search" : "No physiotherapists available at the moment"}
                        </p>
                    </div>
                )}

                {!loading && filteredPhysios.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPhysios.map((physio) => (
                            <div key={physio.user_id} className="card-hover p-6 flex flex-col gap-3 text-left">
                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-xl font-bold text-violet-400">
                                    {physio.first_name[0]}{physio.last_name[0]}
                                </div>

                                {/* Name */}
                                <div>
                                    <h3 className="font-semibold text-lg leading-tight">
                                        {physio.first_name} {physio.last_name}
                                    </h3>
                                    <p className="text-xs text-muted mt-1">{physio.email}</p>
                                </div>

                                {/* Specialization */}
                                {physio.specialization && (
                                    <span className="badge-info w-fit">
                                        {physio.specialization}
                                    </span>
                                )}

                                {/* Request button */}
                                <button
                                    onClick={() => handleRequest(physio.user_id)}
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
                                            Sending…
                                        </span>
                                    ) : (
                                        "Send Request"
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
