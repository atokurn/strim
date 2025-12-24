"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Info } from "lucide-react";

export default function HeroSection({ banners }) {
    const [currentBanner, setCurrentBanner] = useState(null);

    useEffect(() => {
        if (banners && banners.length > 0) {
            // Pick a random banner or the first one
            setCurrentBanner(banners[0]);
        }
    }, [banners]);

    if (!currentBanner) return null;

    return (
        <div className="relative w-full h-[50vh] md:h-[80vh] bg-black">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={currentBanner.poster}
                    alt={currentBanner.name}
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="relative h-full container mx-auto px-4 md:px-6 flex items-center">
                <div className="max-w-2xl pt-20">
                    {/* Tags/Genres */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(currentBanner.genres || currentBanner.gendres || []).slice(0, 3).map((genre, idx) => (
                            <span key={idx} className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-xs font-medium text-white">
                                {genre}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                        {currentBanner.name}
                    </h1>

                    <p className="text-white/80 text-sm md:text-lg mb-8 line-clamp-3 md:line-clamp-4 max-w-lg">
                        {currentBanner.desc || "Experience the drama, romance, and excitement. Start watching now!"}
                    </p>

                    <div className="flex gap-4">
                        <Link
                            href={`/drama/${currentBanner.id}`}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-white/90 transition-colors"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Play Now
                        </Link>
                        <Link
                            href={`/drama/${currentBanner.id}`}
                            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-md font-semibold hover:bg-white/30 transition-colors"
                        >
                            <Info className="w-5 h-5" />
                            More Info
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
