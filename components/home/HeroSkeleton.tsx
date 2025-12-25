"use client";

/**
 * HeroSkeleton - Loading placeholder for hero section
 * Matches the aspect ratio and layout of HeroSection for smooth loading
 */
export default function HeroSkeleton() {
    return (
        <div className="relative w-full aspect-[3/4] md:h-[80vh] bg-black animate-pulse">
            {/* Background placeholder */}
            <div className="absolute inset-0 bg-gray-800" />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

            {/* Content placeholder */}
            <div className="absolute inset-x-0 bottom-0 p-4 pb-8 flex flex-col items-start justify-end h-full">
                {/* Title skeleton */}
                <div className="h-12 w-3/4 bg-gray-700 rounded-lg mb-3" />

                {/* Subtitle skeleton */}
                <div className="h-4 w-1/2 bg-gray-700/50 rounded" />
            </div>

            {/* Pagination dots placeholder */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
                {[...Array(5)].map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1.5 rounded-full bg-gray-600 ${idx === 0 ? "w-6" : "w-1.5"}`}
                    />
                ))}
            </div>
        </div>
    );
}
