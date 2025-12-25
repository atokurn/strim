"use client";

// =============================================================================
// BackToTop - Floating button to scroll back to top
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackToTopProps {
    /** Scroll threshold before showing button (in pixels) */
    threshold?: number;
    className?: string;
}

/**
 * BackToTop - Floating button that appears after scrolling down
 */
export default function BackToTop({ threshold = 500, className }: BackToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Track scroll position
    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > threshold);
        };

        // Check initial scroll position
        handleScroll();

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [threshold]);

    // Smooth scroll to top
    const scrollToTop = useCallback(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, []);

    return (
        <button
            onClick={scrollToTop}
            className={cn(
                "fixed bottom-24 right-4 z-50 p-3 rounded-full",
                "bg-[#C2410C] text-white shadow-lg",
                "transition-all duration-300 ease-out",
                "hover:bg-[#C2410C]/90 hover:scale-110",
                "active:scale-95",
                isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none",
                className
            )}
            aria-label="Back to top"
        >
            <ChevronUp className="w-5 h-5" />
        </button>
    );
}
