// =============================================================================
// useInfiniteScroll Hook - Efficient infinite scrolling with IntersectionObserver
// =============================================================================

import { useRef, useCallback, useState, useEffect } from "react";

interface UseInfiniteScrollOptions {
    /** Called when sentinel becomes visible */
    onLoadMore: () => Promise<void>;
    /** Whether there are more items to load */
    hasMore: boolean;
    /** Whether a request is currently in flight */
    isLoading: boolean;
    /** Root margin for early triggering (e.g., "200px" to prefetch) */
    rootMargin?: string;
    /** Intersection threshold (0-1) */
    threshold?: number;
}

interface UseInfiniteScrollReturn {
    /** Ref to attach to the sentinel element */
    sentinelRef: (node: HTMLElement | null) => void;
    /** Reset the observer (e.g., when filters change) */
    reset: () => void;
}

/**
 * Custom hook for infinite scrolling with IntersectionObserver
 * 
 * Features:
 * - Uses IntersectionObserver for efficient scroll detection
 * - Supports rootMargin for prefetching before reaching bottom
 * - Prevents duplicate requests via isLoading check
 * - Automatically stops observing when hasMore is false
 * - Cleanup on unmount
 */
export function useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    rootMargin = "200px",
    threshold = 0.1,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Lock to prevent duplicate requests
    const loadingLockRef = useRef(false);

    // Callback ref for the sentinel element
    const sentinelRef = useCallback(
        (node: HTMLElement | null) => {
            // Disconnect previous observer
            if (observerRef.current) {
                observerRef.current.disconnect();
            }

            // Don't observe if no more items or currently loading
            if (!hasMore || isLoading) {
                return;
            }

            // Create new observer
            observerRef.current = new IntersectionObserver(
                async (entries) => {
                    const [entry] = entries;

                    // Check if intersecting and not already loading
                    if (entry.isIntersecting && !loadingLockRef.current && hasMore && !isLoading) {
                        // Lock to prevent duplicate calls
                        loadingLockRef.current = true;
                        setIsLoadingMore(true);

                        try {
                            await onLoadMore();
                        } finally {
                            // Unlock after a small delay to prevent rapid re-triggering
                            setTimeout(() => {
                                loadingLockRef.current = false;
                                setIsLoadingMore(false);
                            }, 100);
                        }
                    }
                },
                {
                    rootMargin,
                    threshold,
                }
            );

            // Observe the sentinel element
            if (node) {
                observerRef.current.observe(node);
            }
        },
        [hasMore, isLoading, onLoadMore, rootMargin, threshold]
    );

    // Reset function to use when filters change
    const reset = useCallback(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        loadingLockRef.current = false;
        setIsLoadingMore(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    return {
        sentinelRef,
        reset,
    };
}
