"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HeroSection({ banners, source = "dramadash" }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-slide effect
    useEffect(() => {
        if (!banners || banners.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % Math.min(banners.length, 5));
        }, 5000);

        return () => clearInterval(interval);
    }, [banners]);

    const currentBanner = banners?.[currentIndex];

    if (!currentBanner) return null;

    const bannerSource = currentBanner.source || source;
    const dramaHref = `/drama/${bannerSource}/${currentBanner.id}`;

    return (
        <div className="relative w-full aspect-[3/4] md:h-[80vh] bg-black">
            {/* Background Image - LCP Critical Element */}
            <div className="absolute inset-0">
                <Image
                    key={currentBanner.poster}
                    src={currentBanner.poster}
                    alt={currentBanner.name || currentBanner.title}
                    fill
                    sizes="100vw"
                    priority={currentIndex === 0}
                    className="object-cover animate-in fade-in duration-700"
                />
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
            </div>

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-4 pb-8 flex flex-col items-start justify-end h-full pointer-events-none">
                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-serif italic text-white mb-2 leading-none drop-shadow-lg opacity-90 animate-in slide-in-from-bottom-2 duration-500">
                    {currentBanner.name || currentBanner.title}
                </h1>

                {/* Subtitle / Tagline */}
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium drop-shadow-md animate-in slide-in-from-bottom-3 duration-700">
                    <span>{currentBanner.desc || currentBanner.description || "Trending Drama Series"}</span>
                    <span className="text-blue-300">❄️</span>
                </div>
            </div>

            {/* Pagination Dots (Clickable) */}
            <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
                {banners.slice(0, 5).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.preventDefault();
                            setCurrentIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>

            {/* Clickable Area Overlay */}
            <Link href={dramaHref} className="absolute inset-0 z-10" />
        </div>
    );
}
