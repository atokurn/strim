"use client";

// =============================================================================
// VideoGrid - Append-only grid with skeleton loaders and batch separators
// =============================================================================

import React, { useMemo } from "react";
import OptimizedVideoCard from "@/components/shared/OptimizedVideoCard";
import { cn } from "@/lib/utils";

interface VideoData {
    id: string | number;
    source: string;
    title?: string;
    name?: string;
    poster?: string;
    img?: string;
    [key: string]: unknown;
}

interface VideoGridProps {
    videos: VideoData[];
    isLoading?: boolean;
    batchSize?: number;
    showSeparators?: boolean;
    className?: string;
}

/**
 * Skeleton loader for video cards
 */
function VideoCardSkeleton() {
    return (
        <div className="aspect-[2/3] rounded-lg bg-white/5 animate-pulse overflow-hidden">
            <div className="h-full w-full bg-gradient-to-br from-white/5 to-white/10" />
        </div>
    );
}

/**
 * Batch separator for visual distinction
 */
function BatchSeparator({ batchNumber }: { batchNumber: number }) {
    return (
        <div className="col-span-full flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs text-white/30 font-medium">Page {batchNumber}</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
    );
}

/**
 * VideoGrid - Optimized grid with append-only behavior
 * 
 * Features:
 * - Uses memoized OptimizedVideoCard to prevent re-renders
 * - Shows skeleton loaders while loading
 * - Optional batch separators for visual breaks
 * - Append-only: previously rendered items are not affected
 */
export default function VideoGrid({
    videos,
    isLoading = false,
    batchSize = 20,
    showSeparators = false,
    className,
}: VideoGridProps) {
    // Split videos into batches for separators
    const batches = useMemo(() => {
        if (!showSeparators) return [videos];

        const result: VideoData[][] = [];
        for (let i = 0; i < videos.length; i += batchSize) {
            result.push(videos.slice(i, i + batchSize));
        }
        return result;
    }, [videos, batchSize, showSeparators]);

    return (
        <div
            className={cn(
                "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3",
                className
            )}
        >
            {showSeparators ? (
                // Render with separators
                batches.map((batch, batchIndex) => (
                    <React.Fragment key={`batch-${batchIndex}`}>
                        {batchIndex > 0 && <BatchSeparator batchNumber={batchIndex + 1} />}
                        {batch.map((video, index) => (
                            <OptimizedVideoCard
                                key={`${video.source}-${video.id}`}
                                video={video}
                                // First 6 items get priority loading
                                priority={batchIndex === 0 && index < 6}
                            />
                        ))}
                    </React.Fragment>
                ))
            ) : (
                // Render without separators
                videos.map((video, index) => (
                    <OptimizedVideoCard
                        key={`${video.source}-${video.id}`}
                        video={video}
                        priority={index < 6}
                    />
                ))
            )}

            {/* Loading skeletons */}
            {isLoading && (
                <>
                    {Array.from({ length: batchSize }).map((_, index) => (
                        <VideoCardSkeleton key={`skeleton-${index}`} />
                    ))}
                </>
            )}
        </div>
    );
}
