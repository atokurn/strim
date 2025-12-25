import Link from "next/link";
import { streamService, DEFAULT_SOURCE, SUPPORTED_SOURCES } from "@/lib/services/StreamService";
import HeroSection from "@/components/home/HeroSection";
import ContinueWatching from "@/components/home/ContinueWatching";
import MovieCard from "@/components/shared/MovieCard";

export const dynamic = "force-dynamic";

export default async function Home() {
    // Fetch aggregated home data from all sources
    const aggregatedRes = await streamService.getAggregatedHome();

    // Track which sources returned data
    const activeSources = new Set();

    // Combine data from all sources
    let allBanners = [];
    let allTrending = [];
    let allLatest = [];

    if (aggregatedRes.data?.sources) {
        for (const { source, data } of aggregatedRes.data.sources) {
            activeSources.add(source);
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
            activeSources.add(DEFAULT_SOURCE);
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

    // Interleave videos from different sources for balanced display
    const interleaveBySource = (videos, limit) => {
        const bySource = {};
        videos.forEach(v => {
            if (!bySource[v.source]) bySource[v.source] = [];
            bySource[v.source].push(v);
        });

        const sources = Object.keys(bySource);
        const result = [];
        let index = 0;

        while (result.length < limit) {
            let added = false;
            for (const source of sources) {
                if (bySource[source][index]) {
                    result.push(bySource[source][index]);
                    added = true;
                    if (result.length >= limit) break;
                }
            }
            if (!added) break;
            index++;
        }

        return result;
    };

    const trending = interleaveBySource(dedupeVideos(allTrending), 15);
    const latest = interleaveBySource(dedupeVideos(allLatest), 12);

    return (
        <div className="min-h-screen pb-24 bg-black">
            {/* Hero Carousel */}
            <HeroSection banners={banners} source={banners[0]?.source || DEFAULT_SOURCE} />

            <div className="space-y-8 -mt-6 relative z-10">
                {/* Continue Watching */}
                <ContinueWatching />

                {/* Hot Section (Ranked) */}
                {trending.length > 0 && (
                    <section className="px-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Hot</h2>
                            <Link href="/explore?tab=peringkat" className="text-xs text-white/50">Details {'>'}</Link>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar">
                            {trending.map((movie, index) => (
                                <Link
                                    key={`trending-${movie.id}`}
                                    href={`/drama/${movie.source}/${movie.id}`}
                                    className="flex-shrink-0 w-28 md:w-40 relative group aspect-[3/4] rounded-lg overflow-hidden block bg-white/5"
                                >
                                    <img
                                        src={movie.poster}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Rank Number Overlay */}
                                    <div className="absolute -bottom-6 -right-2 text-[80px] font-bold text-white/20 italic font-serif leading-none select-none pointer-events-none stroke-black">
                                        {index + 1}
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-[#EDB359] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                                            VIP
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <h3 className="text-xs text-white font-medium line-clamp-1">{movie.title}</h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Latest Section */}
                {latest.length > 0 && (
                    <section className="px-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Terbaru</h2>
                            <Link href="/explore?tab=jelajah" className="text-xs text-white/50">More {'>'}</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {latest.map((movie, index) => (
                                <Link
                                    key={`latest-${movie.id}`}
                                    href={`/drama/${movie.source}/${movie.id}`}
                                    className="group block space-y-2"
                                >
                                    {/* Image Container */}
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#1e1e1e]">
                                        <img
                                            src={movie.poster}
                                            alt={movie.title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />

                                        {/* Top Overlay: Badges */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                            {/* Trending Badge Removed */}{null}
                                            {/* Status Badge */}
                                            {index % 2 === 0 ? (
                                                <span className="bg-[#C2410C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-md">
                                                    Trailer
                                                </span>
                                            ) : (
                                                <span className="bg-[#EDB359] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-md">
                                                    VIP
                                                </span>
                                            )}
                                        </div>

                                        {/* Bottom Overlay: View Count */}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                            <div className="flex items-center gap-1.5 text-[10px] text-white/90 font-medium">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                <span>{movie.viewCount ? (movie.viewCount >= 1000 ? `${(movie.viewCount / 1000).toFixed(1)}K` : movie.viewCount) : "1.2K"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="space-y-0.5">
                                        <h3 className="text-white text-sm font-semibold line-clamp-1 group-hover:text-[#E5B560] transition-colors">{movie.title}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                                            <span className="capitalize">{movie.source}</span>
                                            {(movie.totalEpisodes || movie.episodes?.length) ? (
                                                <>
                                                    <span className="w-0.5 h-0.5 rounded-full bg-white/50" />
                                                    <span>{movie.totalEpisodes || movie.episodes?.length} Eps</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
