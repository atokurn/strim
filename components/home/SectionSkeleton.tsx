"use client";

/**
 * SectionSkeleton - Loading placeholder for content sections
 * Used for Trending, Latest, and other grid sections
 */
interface SectionSkeletonProps {
    title?: string;
    itemCount?: number;
    layout?: "horizontal" | "grid";
}

export default function SectionSkeleton({
    title = "Loading...",
    itemCount = 6,
    layout = "horizontal"
}: SectionSkeletonProps) {
    return (
        <section className="px-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-24 bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-700/50 rounded" />
            </div>

            {/* Content Grid */}
            {layout === "horizontal" ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {[...Array(itemCount)].map((_, idx) => (
                        <div
                            key={idx}
                            className="flex-shrink-0 w-28 md:w-40 aspect-[3/4] rounded-lg bg-gray-800"
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(itemCount)].map((_, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="aspect-[3/4] rounded-lg bg-gray-800" />
                            <div className="h-4 w-full bg-gray-700 rounded" />
                            <div className="h-3 w-2/3 bg-gray-700/50 rounded" />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
