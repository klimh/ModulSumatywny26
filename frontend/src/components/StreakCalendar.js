"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

function FlameIcon({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22c4.4 0 8-3.4 8-7.8 0-2.9-1.5-5.4-3.8-6.8.2 1.9-.6 3.2-1.7 3.9.2-3.1-1.6-6-4.6-8.3.1 3.3-1.2 5.1-2.7 6.6C5.8 11 4 12.8 4 15.3 4 19.4 7.4 22 12 22z" />
        </svg>
    );
}

export default function StreakCalendar({ patientId, title = "Historia passy" }) {
    const today = useMemo(() => new Date(), []);
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
    const [calendar, setCalendar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadCalendar = async () => {
            if (!patientId) return;
            try {
                setLoading(true);
                setError("");
                const data = await api.streaks.getCalendar(patientId, cursor.year, cursor.month);
                setCalendar(data);
            } catch (err) {
                setError(err.message || "Nie udalo sie pobrac historii passy");
            } finally {
                setLoading(false);
            }
        };
        loadCalendar();
    }, [patientId, cursor]);

    const weeks = useMemo(() => {
        if (!calendar?.days) return [];
        const first = new Date(cursor.year, cursor.month - 1, 1);
        const leading = (first.getDay() + 6) % 7;
        const cells = [
            ...Array.from({ length: leading }, () => null),
            ...calendar.days,
        ];
        while (cells.length % 7 !== 0) cells.push(null);
        const result = [];
        for (let i = 0; i < cells.length; i += 7) {
            result.push(cells.slice(i, i + 7));
        }
        return result;
    }, [calendar, cursor]);

    const monthLabel = new Date(cursor.year, cursor.month - 1, 1).toLocaleDateString("pl-PL", {
        month: "long",
        year: "numeric",
    });

    const moveMonth = (delta) => {
        const next = new Date(cursor.year, cursor.month - 1 + delta, 1);
        setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
    };

    const dayClass = (status) => {
        if (status === "completed") return "bg-emerald-500/80 text-white border-emerald-300/60";
        if (status === "missed") return "bg-rose-500/20 text-rose-300 border-rose-400/30";
        if (status === "frozen") return "bg-cyan-500/25 text-cyan-200 border-cyan-300/30";
        return "bg-white/[0.04] text-muted border-outline/50";
    };

    return (
        <section className="card p-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FlameIcon className="w-5 h-5 text-amber-400" />
                        {title}
                    </h2>
                    {calendar && (
                        <p className="text-xs text-muted mt-1">
                            {calendar.active_days} aktywnych dni w miesiacu, rekord: {calendar.longest_streak} dni
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => moveMonth(-1)} className="btn-ghost !px-3" aria-label="Poprzedni miesiac">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel}</span>
                    <button onClick={() => moveMonth(1)} className="btn-ghost !px-3" aria-label="Nastepny miesiac">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {error && <div className="error-box mb-4">{error}</div>}
            {loading ? (
                <div className="text-sm text-muted py-8 text-center">Ladowanie kalendarza...</div>
            ) : (
                <>
                    <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                        {["Pn", "Wt", "Sr", "Cz", "Pt", "So", "Nd"].map(day => (
                            <span key={day} className="text-[11px] uppercase font-bold text-muted">{day}</span>
                        ))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="grid grid-cols-7 gap-1.5">
                                {week.map((day, di) => (
                                    <div
                                        key={`${wi}-${di}`}
                                        className={`aspect-square rounded-lg border flex items-center justify-center text-xs font-bold ${day ? dayClass(day.status) : "border-transparent"}`}
                                        title={day ? `${day.date}: ${day.status}` : ""}
                                    >
                                        {day ? new Date(day.date).getDate() : ""}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/80"></span> wykonane</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-400/30"></span> pominiete</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/[0.04] border border-outline"></span> bez zadan</span>
                    </div>
                </>
            )}
        </section>
    );
}

export { FlameIcon };
