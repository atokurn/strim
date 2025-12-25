import { streamService, DEFAULT_SOURCE, SUPPORTED_SOURCES } from "@/lib/services/StreamService";
import HeroSection from "@/components/home/HeroSection";
import MovieCard from "@/components/shared/MovieCard";

export const dynamic = "force-dynamic";

export default async function Home() {
    // Fetch aggregated home data from all sources
    const aggregatedRes = await streamService.getAggregatedHome();

    // Combine data from all sources
    let allBanners = [];
    let allTrending = [];
    let allLatest = [];

    if (aggregatedRes.data?.sources) {
        for (const { source, data } of aggregatedRes.data.sources) {
            if (data.banners) {
                allBanners.push(...data.banners.map(b => ({ ...b, source })));
            }
            if (data.trending) {
                allTrending.push(...data.trending.map(t => ({ ...t, source })));
            }
            if (data.latest) {
                allLatest.push(...data.latest.map(l => ({ ...l, source })));
            }
        }
    }

    // Fallback to single source if aggregation fails
    if (allBanners.length === 0 && allTrending.length === 0) {
        const homeRes = await streamService.getHome(DEFAULT_SOURCE);
        if (homeRes.data) {
            allBanners = homeRes.data.banners || [];
            allTrending = homeRes.data.trending || [];
            allLatest = homeRes.data.latest || [];
        }
    }

    if (allBanners.length === 0 && allTrending.length === 0 && allLatest.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Failed to load data. Please try again later.</p>
            </div>
        );
    }

    // Transform banners for HeroSection (add source info)
    const banners = allBanners.slice(0, 5).map((b) => ({
        ...b,
        name: b.title,
    }));

    // Dedupe by id + source
    const dedupeVideos = (videos) => {
        const seen = new Set();
        return videos.filter((v) => {
            const key = `${v.source}:${v.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const trending = dedupeVideos(allTrending).slice(0, 10);
    const latest = dedupeVideos(allLatest).slice(0, 10);

    return (
        <div className="min-h-screen pb-20">
            <HeroSection banners={banners} source={banners[0]?.source || DEFAULT_SOURCE} />

            <div className="container mx-auto px-4 md:px-6 relative z-10 -mt-20 md:-mt-32 space-y-12">
                {/* Source Indicator */}
                <div className="flex items-center gap-2 pt-4 flex-wrap">
                    <span className="text-sm text-white/50">Sources:</span>
                    {SUPPORTED_SOURCES.map((src) => (
                        <span
                            key={src}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/70"
                        >
                            {src.charAt(0).toUpperCase() + src.slice(1)}
                        </span>
                    ))}
                </div>

                {/* Trending Section */}
                {trending.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            🔥 Trending Now
                            <span className="text-sm font-normal text-white/50">
                                ({trending.length} from all sources)
                            </span>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {trending.map((movie, index) => (
                                <MovieCard
                                    key={`trending-${movie.source}-${movie.id}-${index}`}
                                    movie={{ ...movie, name: movie.title }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Hot Section - placeholder for Redis-backed data */}
                {/* This will show time-weighted 24h popular content when Redis is configured */}

                {/* Latest Section */}
                {latest.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">✨ Latest Dramas</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {latest.map((movie, index) => (
                                <MovieCard
                                    key={`latest-${movie.source}-${movie.id}-${index}`}
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
