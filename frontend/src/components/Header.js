"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { translations } from "@/lib/i18n/translations";

const NAV_ITEMS_GUEST = [
    { href: "/login", labelKey: "header.logIn" },
    { href: "/register", labelKey: "header.signUp" },
];

const NAV_ITEMS_PATIENT = [
    { href: "/dashboard", labelKey: "header.dashboard" },
    { href: "/dashboard/plan", labelKey: "header.rehabPlan" },
    { href: "/dashboard/progress", labelKey: "header.myProgress" },
    { href: "/dashboard/chat", labelKey: "header.chat" },
];

const NAV_ITEMS_PHYSIO = [
    { href: "/dashboard", labelKey: "header.dashboard" },
    { href: "/dashboard/patients", labelKey: "header.patients" },
    { href: "/dashboard/exercises", labelKey: "header.exercises" },
    { href: "/dashboard/requests", labelKey: "header.requests" },
    { href: "/dashboard/chat", labelKey: "header.chat" },
];

function SunIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    );
}

function MenuIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

export default function Header() {
    const { user, logout, loading } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useTranslation();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        let interval;
        const fetchUnread = async () => {
            if (!user) return;
            try {
                const res = await api.chat.getUnreadCount();
                setUnreadCount(res.unread_count || 0);
            } catch (e) {
                //nic
            }
        };

        if (user) {
            fetchUnread();
            interval = setInterval(fetchUnread, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        }
    }, [user]);

    const navItems = !user
        ? NAV_ITEMS_GUEST
        : user.role === "fizjoterapeuta"
            ? NAV_ITEMS_PHYSIO
            : NAV_ITEMS_PATIENT;

    const isActive = (href) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    return (
        <header className="w-full sticky top-0 z-50 backdrop-blur-xl bg-panel/80 border-b border-outline">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    <Link href="/" className="flex items-center gap-2 no-underline group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-shadow duration-300">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-primary">
                            RehabSense
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 no-underline inline-flex items-center justify-center ${isActive(item.href)
                                    ? "bg-gradient-to-r from-teal-500/15 to-cyan-500/15 text-primary border border-teal-500/20"
                                    : "text-muted hover:text-primary hover:bg-panel"
                                    }`}
                            >
                                <div className="grid place-items-center">
                                    <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                                        {translations['en'][item.labelKey] || item.labelKey}
                                    </span>
                                    <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                                        {translations['pl'][item.labelKey] || item.labelKey}
                                    </span>
                                    <span className="col-start-1 row-start-1 whitespace-nowrap">
                                        {t(item.labelKey)}
                                    </span>
                                </div>
                                {item.labelKey === "header.chat" && unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'pl' : 'en')}
                            className="px-2 py-1 rounded-xl text-lg hover:bg-panel border border-outline transition-all duration-300 cursor-pointer"
                            aria-label="Toggle language"
                        >
                            {language === 'en' ? '🇬🇧' : '🇵🇱'}
                        </button>

                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-panel transition-all duration-300 cursor-pointer"
                            aria-label="Toggle theme"
                        >
                            {mounted && (theme === "dark" ? <SunIcon /> : <MoonIcon />)}
                        </button>

                        {user && !loading && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-main border border-outline">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                            {user.first_name?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-primary">
                                        {user.first_name}
                                    </span>
                                    <span className="badge-info text-[10px] py-0.5 px-1.5 inline-grid place-items-center">
                                        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                                            {user.role === "fizjoterapeuta" ? translations['en']['header.physio'] : translations['en']['header.patient']}
                                        </span>
                                        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                                            {user.role === "fizjoterapeuta" ? translations['pl']['header.physio'] : translations['pl']['header.patient']}
                                        </span>
                                        <span className="col-start-1 row-start-1 whitespace-nowrap">
                                            {user.role === "fizjoterapeuta" ? t('header.physio') : t('header.patient')}
                                        </span>
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="btn-ghost text-xs text-danger hover:bg-danger-panel cursor-pointer inline-grid place-items-center"
                                >
                                    <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{translations['en']['header.logOut']}</span>
                                    <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{translations['pl']['header.logOut']}</span>
                                    <span className="col-start-1 row-start-1 whitespace-nowrap">{t('header.logOut')}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className="md:hidden p-2 rounded-xl text-muted hover:text-primary hover:bg-panel transition-all duration-300 cursor-pointer"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>

                {mobileOpen && (
                    <div className="md:hidden pb-4 pt-2 border-t border-outline animate-fade-in">
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 no-underline ${isActive(item.href)
                                        ? "bg-gradient-to-r from-teal-500/15 to-cyan-500/15 text-primary border border-teal-500/20"
                                        : "text-muted hover:text-primary hover:bg-main"
                                        }`}
                                >
                                    {t(item.labelKey)}
                                    {item.labelKey === "header.chat" && unreadCount > 0 && (
                                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                    )}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="btn-ghost"
                                    aria-label="Toggle theme"
                                >
                                    {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                                </button>
                                <button
                                    onClick={() => setLanguage(language === 'en' ? 'pl' : 'en')}
                                    className="btn-ghost text-lg"
                                    aria-label="Toggle language"
                                >
                                    {language === 'en' ? '🇬🇧' : '🇵🇱'}
                                </button>
                            </div>

                            {user && (
                                <button
                                    onClick={() => { logout(); setMobileOpen(false); }}
                                    className="btn-ghost text-danger"
                                >
                                    {t('header.logOut')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
