"use client";

import { useEffect, useState } from "react";

export default function AmbientBackground() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Initial position in center
        setMousePosition({ 
            x: window.innerWidth / 2, 
            y: window.innerHeight / 2 
        });

        const updateMousePosition = (ev) => {
            setMousePosition({ x: ev.clientX, y: ev.clientY });
        };
        
        window.addEventListener("mousemove", updateMousePosition);
        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
        };
    }, []);

    if (!isMounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] mix-blend-screen dark:mix-blend-lighten">
            {/* Primary tracking blob */}
            <div 
                className="absolute w-[600px] h-[600px] rounded-full blur-[120px] bg-emerald-500/20 dark:bg-emerald-500/10 opacity-60 transition-transform duration-1000 ease-out"
                style={{
                    transform: `translate(${mousePosition.x - 300}px, ${mousePosition.y - 300}px)`,
                }}
            />
            {/* Secondary delayed blob */}
            <div 
                className="absolute w-[800px] h-[800px] rounded-full blur-[140px] bg-indigo-500/15 dark:bg-indigo-500/10 opacity-50 transition-transform duration-[2000ms] ease-out"
                style={{
                    transform: `translate(${mousePosition.x - 400 + 100}px, ${mousePosition.y - 400 - 50}px)`,
                }}
            />
            {/* Tertiary slow blob */}
            <div 
                className="absolute w-[500px] h-[500px] rounded-full blur-[100px] bg-violet-500/15 dark:bg-violet-500/10 opacity-40 transition-transform duration-[3000ms] ease-out"
                style={{
                    transform: `translate(${mousePosition.x - 250 - 150}px, ${mousePosition.y - 250 + 100}px)`,
                }}
            />
        </div>
    );
}
