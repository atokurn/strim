"use client";

// =============================================================================
// OptimizedVideoCard - Memoized card component with next/image
// =============================================================================

import React, { memo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoData {
    id: string | number;
    source: string;
    title?: string;
    name?: string;
    poster?: string;
    img?: string;
    description?: string;
    year?: string | number;
    releaseYear?: number;
    genres?: string[] | string;
    viewCount?: number;
    viewsTotal?: number;
}

interface OptimizedVideoCardProps {
    video: VideoData;
    className?: string;
    priority?: boolean;
}

/**
 * Memoized video card with next/image for optimized loading
 * Uses React.memo with custom comparison to prevent unnecessary re-renders
 */
const OptimizedVideoCard = memo(
    function OptimizedVideoCard({ video, className, priority = false }: OptimizedVideoCardProps) {
        if (!video) return null;

        const source = video.source || "dramadash";
        const href = `/drama/${source}/${video.id}`;
        const title = video.name || video.title || "Untitled";
        const poster = video.poster || video.img || "/placeholder-poster.jpg";
        const viewCount = video.viewCount || video.viewsTotal || 0;

        return (
            <Link
                href={href}
                className={cn(
                    "group relative block aspect-[2/3] overflow-hidden rounded-lg bg-secondary",
                    "transform-gpu transition-transform duration-200 hover:scale-[1.02]",
                    className
                )}
            >
                {/* Optimized Image with next/image */}
                <Image
                    src={poster}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    loading={priority ? "eager" : "lazy"}
                    priority={priority}
                />

                {/* Source Badge */}
                <div className="absolute top-2 left-2 z-10">
                    <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded uppercase backdrop-blur-sm">
                        {source}
                    </span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 p-4 w-full">
                        <h3 className="text-white font-semibold line-clamp-2 text-sm md:text-base">
                            {title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                            <button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 transition-colors">
                                <Play className="w-4 h-4 fill-current" />
                            </button>
                            <span className="text-xs text-white/80">
                                {viewCount > 0 ? `${viewCount.toLocaleString()} views` : "Watch Now"}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        );
    },
    // Custom comparison - only re-render if video id or key props change
    (prevProps, nextProps) => {
        return (
            prevProps.video.id === nextProps.video.id &&
            prevProps.video.source === nextProps.video.source &&
            prevProps.className === nextProps.className &&
            prevProps.priority === nextProps.priority
        );
    }
);

export default OptimizedVideoCard;
