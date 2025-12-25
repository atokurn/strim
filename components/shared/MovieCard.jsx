"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MovieCard - Displays a drama/movie card with poster and hover effects
 * 
 * Props:
 * - movie: NormalizedDrama object with id, source, title, poster
 * - className: Optional additional CSS classes
 */
export default function MovieCard({ movie, className }) {
    if (!movie) return null;

    // Use source-aware routing if source is available, otherwise fallback to dramadash
    const source = movie.source || "dramadash";
    const href = `/drama/${source}/${movie.id}`;
    const isHorizontal = className?.includes("horizontal") || movie.layout === "horizontal";

    if (isHorizontal) {
        return (
            <Link
                href={href}
                className={cn(
                    "group relative flex gap-3 overflow-hidden rounded-lg bg-secondary/50 hover:bg-white/5 transition-colors p-2",
                    className
                )}
            >
                <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md">
                    <img
                        src={movie.poster || movie.img}
                        alt={movie.name || movie.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                    <div className="absolute top-1 left-1">
                        <span className="px-1 py-0.5 bg-black/70 text-white text-[8px] rounded uppercase backdrop-blur-sm">
                            {source}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col justify-center min-w-0">
                    <h3 className="text-white font-semibold line-clamp-1 text-base group-hover:text-primary transition-colors">
                        {movie.name || movie.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                        <span>{movie.year || "2024"}</span>
                        <span>•</span>
                        <span className="capitalize">{movie.genres?.[0] || "Drama"}</span>
                    </div>
                    <div className="mt-2 text-xs text-white/50 line-clamp-2">
                        {movie.description}
                    </div>
                </div>
            </Link>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                "group relative block aspect-[2/3] overflow-hidden rounded-lg bg-secondary",
                className
            )}
        >
            <img
                src={movie.poster || movie.img}
                alt={movie.name || movie.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
            />

            {/* Source Badge */}
            <div className="absolute top-2 left-2 z-10">
                <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded uppercase backdrop-blur-sm">
                    {source}
                </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 p-4 w-full">
                    <h3 className="text-white font-semibold line-clamp-2 text-sm md:text-base">
                        {movie.name || movie.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 transition-colors">
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                        <span className="text-xs text-white/80">
                            {movie.viewCount ? `${movie.viewCount.toLocaleString()} views` : "Watch Now"}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
