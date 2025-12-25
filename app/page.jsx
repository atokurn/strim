import Link from "next/link";
import Image from "next/image";
import { streamService, DEFAULT_SOURCE } from "@/lib/services/StreamService";
import { trendingService } from "@/lib/services/TrendingService";
import HeroSection from "@/components/home/HeroSection";
import ContinueWatching from "@/components/home/ContinueWatching";
import MovieCard from "@/components/shared/MovieCard";

export const dynamic = "force-dynamic";

export default async function Home() {
    // Parallel Fetching:
    // 1. Banners (External - Default Source)
    // 2. Trending (Local DB - explore_index)
    // 3. Latest (Local DB - explore_index)

    const [homeRes, trendingVideos, latestVideos] = await Promise.all([
        streamService.getHome(DEFAULT_SOURCE).catch(() => ({ data: { banners: [] } })),
        trendingService.getTrending(15),
        trendingService.getHot(12)
    ]);

    // Banners from external source
    const banners = (homeRes.data?.banners || []).slice(0, 5).map((b) => ({
        ...b,
        name: b.title,
    }));

    // Local data is already sorted and mixed by the explore_index logic
    const trending = trendingVideos;
    const latest = latestVideos;

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
                                    <Image
                                        src={movie.poster}
                                        alt={movie.title}
                                        fill
                                        sizes="(max-width: 768px) 112px, 160px"
                                        className="object-cover"
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
                                        <Image
                                            src={movie.poster}
                                            alt={movie.title}
                                            fill
                                            sizes="(max-width: 768px) 33vw, 25vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-110"
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
