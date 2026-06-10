"use client";

import { useState, useRef, useCallback } from "react";

export default function TiltCard({ children, className = "", onClick, role, tabIndex }) {
    const cardRef = useRef(null);
    const [style, setStyle] = useState({});

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        
        const rect = cardRef.current.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation (max 8 degrees)
        const rotateX = ((y - centerY) / centerY) * -8; 
        const rotateY = ((x - centerX) / centerX) * 8;
        
        setStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
            transition: "none"
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setStyle({
            transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
            transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)"
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setStyle(prev => ({ ...prev, transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)" }));
    }, []);

    return (
        <div 
            ref={cardRef}
            className={`will-change-transform ${className}`}
            style={{
                ...style,
                transformStyle: "preserve-3d"
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onClick={onClick}
            role={role}
            tabIndex={tabIndex}
        >
            {children}
        </div>
    );
}
