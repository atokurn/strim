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
