import { streamService, DEFAULT_SOURCE, SUPPORTED_SOURCES } from "@/lib/services/StreamService";
import HeroSection from "@/components/home/HeroSection";
import MovieCard from "@/components/shared/MovieCard";

export const dynamic = "force-dynamic";

export default async function Home() {
    // Fetch home data from the default source (DramaDash)
    const homeRes = await streamService.getHome(DEFAULT_SOURCE);
    const data = homeRes.data;

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Failed to load data. Please try again later.</p>
            </div>
        );
    }

    // Transform banners for HeroSection (add source info)
    const banners = data.banners.map((b) => ({
        ...b,
        name: b.title, // HeroSection expects 'name'
    }));

    return (
        <div className="min-h-screen pb-20">
            <HeroSection banners={banners} source={DEFAULT_SOURCE} />

            <div className="container mx-auto px-4 md:px-6 relative z-10 -mt-20 md:-mt-32 space-y-12">
                {/* Source Tabs */}
                <div className="flex items-center gap-4 pt-4">
                    {SUPPORTED_SOURCES.map((src) => (
                        <span
                            key={src}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${src === DEFAULT_SOURCE
                                ? "bg-primary text-white"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            {src.charAt(0).toUpperCase() + src.slice(1)}
                        </span>
                    ))}
                </div>

                {/* Trending Section */}
                {data.trending && data.trending.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Trending Now</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {data.trending.map((movie, index) => (
                                <MovieCard
                                    key={`trending-${movie.id}-${index}`}
                                    movie={{ ...movie, name: movie.title }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Latest Section */}
                {data.latest && data.latest.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Latest Dramas</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {data.latest.map((movie, index) => (
                                <MovieCard
                                    key={`latest-${movie.id}-${index}`}
                                    movie={{ ...movie, name: movie.title }}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
