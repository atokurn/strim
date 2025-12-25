"use client";

import { useState } from "react";
import { SUPPORTED_SOURCES } from "@/lib/services/StreamService";
import type { SourceType } from "@/lib/types";

interface SourceFilterProps {
    activeSource: SourceType | "all";
    onSourceChange: (source: SourceType | "all") => void;
}

export default function SourceFilter({ activeSource, onSourceChange }: SourceFilterProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Sources Option */}
            <button
                onClick={() => onSourceChange("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeSource === "all"
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    }`}
            >
                All Sources
            </button>

            {/* Individual Sources */}
            {SUPPORTED_SOURCES.map((source) => (
                <button
                    key={source}
                    onClick={() => onSourceChange(source)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeSource === source
                            ? "bg-primary text-white shadow-lg shadow-primary/25"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                        }`}
                >
                    {formatSourceName(source)}
                </button>
            ))}
        </div>
    );
}

function formatSourceName(source: string): string {
    // dramadash -> DramaDash, dramabox -> DramaBox
    return source
        .split(/(?=[A-Z])|(?<=[a-z])(?=[A-Z])/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
}
