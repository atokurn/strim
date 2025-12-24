"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MovieCard({ movie, className }) {
    if (!movie) return null;

    return (
        <Link
            href={`/drama/${movie.id}`}
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
                            {movie.viewCount ? `${movie.viewCount} views` : "Watch Now"}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
