"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Star, PlayCircle, Filter } from "lucide-react";
import { SUPPORTED_SOURCES } from "@/lib/services/StreamService";
import MovieCard from "@/components/shared/MovieCard";

function ExploreContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("peringkat"); // peringkat | jelajah

    // State for Peringkat
    const [rankSource, setRankSource] = useState("all");
    const [rankings, setRankings] = useState([]);
    const [loadingRank, setLoadingRank] = useState(true);

    // State for Jelajah
    const [exploreSort, setExploreSort] = useState("popular"); // popular | latest | rating
    const [exploreSource, setExploreSource] = useState("all");
    const [exploreGenre, setExploreGenre] = useState("all");
    const [exploreYear, setExploreYear] = useState("all");
    const [exploreVideos, setExploreVideos] = useState([]);
    const [loadingExplore, setLoadingExplore] = useState(true);

    // Fetch Rankings
    useEffect(() => {
        if (activeTab === "peringkat") {
            setLoadingRank(true);
            const endpoint = rankSource === "all" ? "/api/videos/trending" : `/api/videos/all?source=${rankSource}&limit=20`;

            fetch(endpoint)
                .then(res => res.json())
                .then(data => {
                    setRankings(data.data || []);
                    setLoadingRank(false);
                })
                .catch(err => {
                    console.error("Failed to fetch rankings:", err);
                    setLoadingRank(false);
                });
        }
    }, [activeTab, rankSource]);

    // Fetch Explore Content
    useEffect(() => {
        if (activeTab === "jelajah") {
            setLoadingExplore(true);
            // In a real app, these filters would be passed to API
            // For now, we fetch all and filter client-side or use available params
            let url = `/api/videos/all?limit=50`;
            if (exploreSource !== "all") url += `&source=${exploreSource}`;

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    let videos = data.data || [];

                    // Client-side filtering/sorting for now since API is basic
                    if (exploreYear !== "all") {
                        // Creating fake years for demo since api doesn't return year
                        // In real implementation, normalization should include year
                    }

                    // Sort
                    if (exploreSort === "popular") {
                        videos.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
                    } else if (exploreSort === "latest") {
                        // optimizing for latest if possible
                    }

                    setExploreVideos(videos);
                    setLoadingExplore(false);
                })
                .catch(err => {
                    console.error("Failed to fetch explore:", err);
                    setLoadingExplore(false);
                });
        }
    }, [activeTab, exploreSort, exploreSource, exploreGenre, exploreYear]);


    return (
        <div className="min-h-screen bg-black pb-24 pt-24 md:pt-36 px-4">
            {/* Header Tabs - Updated to match Library Page */}
            <header className="fixed top-0 left-0 w-full z-40 md:z-40 bg-black/80 backdrop-blur-lg border-b border-white/10 pt-4 pb-0 md:top-16">
                <div className="flex px-4 gap-6 justify-center">
                    <button
                        onClick={() => setActiveTab("peringkat")}
                        className={`pb-3 text-lg font-bold border-b-2 transition-colors ${activeTab === "peringkat" ? "text-white border-[#C2410C]" : "text-white/50 border-transparent hover:text-white/80"}`}
                    >
                        Peringkat
                    </button>
                    <button
                        onClick={() => setActiveTab("jelajah")}
                        className={`pb-3 text-lg font-bold border-b-2 transition-colors ${activeTab === "jelajah" ? "text-white border-[#C2410C]" : "text-white/50 border-transparent hover:text-white/80"}`}
                    >
                        Jelajah
                    </button>
                </div>
            </header>

            <div className="container mx-auto">
                {/* Peringkat Tab */}
                {activeTab === "peringkat" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Filter Source - Sticky */}
                        <div className="sticky top-[3.3rem] md:top-[7.3rem] z-30 bg-black/95 backdrop-blur py-2 -mx-4 px-4 md:mx-0 md:px-0">
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                                <FilterPill
                                    label="Semua"
                                    active={rankSource === "all"}
                                    onClick={() => setRankSource("all")}
                                />
                                {SUPPORTED_SOURCES.map(source => (
                                    <FilterPill
                                        key={source}
                                        label={formatSourceName(source)}
                                        active={rankSource === source}
                                        onClick={() => setRankSource(source)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Ranking List */}
                        <div className="space-y-4">
                            {loadingRank ? (
                                <div className="text-white/50 text-center py-10">Loading rankings...</div>
                            ) : (
                                rankings.map((video, index) => (
                                    <RankingCard key={video.id} video={video} index={index + 1} />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Jelajah Tab */}
                {activeTab === "jelajah" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Filters Wrapper - Sticky */}
                        <div className="sticky top-[3.3rem] md:top-[7.3rem] z-30 bg-black/95 backdrop-blur py-2 space-y-3 -mx-4 px-4 md:mx-0 md:px-0 border-b border-white/5 mb-4">
                            {/* Sort Filters */}
                            <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar">
                                <FilterPill label="Terpopuler" active={exploreSort === "popular"} onClick={() => setExploreSort("popular")} variant="primary" />
                                <FilterPill label="Terbaru" active={exploreSort === "latest"} onClick={() => setExploreSort("latest")} variant="secondary" />
                                <FilterPill label="Rating" active={exploreSort === "rating"} onClick={() => setExploreSort("rating")} variant="secondary" />
                            </div>

                            {/* Source Filters */}
                            <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar">
                                <FilterPill label="Semua" active={exploreSource === "all"} onClick={() => setExploreSource("all")} variant="outline" />
                                {SUPPORTED_SOURCES.map(source => (
                                    <FilterPill
                                        key={source}
                                        label={formatSourceName(source)}
                                        active={exploreSource === source}
                                        onClick={() => setExploreSource(source)}
                                        variant="outline"
                                    />
                                ))}
                            </div>

                            {/* Genre Filters */}
                            <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar">
                                {["Semua", "Drama", "Romantis", "Fantasi", "Kostum", "Kerajaan", "Modern", "CEO"].map(genre => (
                                    <FilterPill
                                        key={genre}
                                        label={genre}
                                        active={exploreGenre === genre.toLowerCase() || (exploreGenre === "all" && genre === "Semua")}
                                        onClick={() => setExploreGenre(genre === "Semua" ? "all" : genre.toLowerCase())}
                                        variant="outline"
                                    />
                                ))}
                            </div>

                            {/* Year Filters */}
                            <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar">
                                {["Semua", "2025", "2024", "2023", "2022", "2021"].map(year => (
                                    <FilterPill
                                        key={year}
                                        label={year}
                                        active={exploreYear === year || (exploreYear === "all" && year === "Semua")}
                                        onClick={() => setExploreYear(year === "Semua" ? "all" : year)}
                                        variant="outline"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Grid Content */}
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {loadingExplore ? (
                                <div className="col-span-full text-center text-white/50 py-10">Loading explore...</div>
                            ) : (
                                exploreVideos.map(video => (
                                    <MovieCard key={video.id} movie={video} />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ExplorePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black pt-20 text-center text-white">Loading...</div>}>
            <ExploreContent />
        </Suspense>
    );
}

// Helper Components

function FilterPill({ label, active, onClick, variant = "primary" }) {
    let baseClass = "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border";
    let activeClass = "";
    let inactiveClass = "";

    if (active) {
        activeClass = "bg-[#C2410C] border-[#C2410C] text-white"; // Orange primary
    } else {
        inactiveClass = "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white";
    }

    return (
        <button onClick={onClick} className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
            {label}
        </button>
    );
}

function RankingCard({ video, index }) {
    // Determine number color based on rank
    let numColor = "text-white/50";
    if (index === 1) numColor = "text-yellow-500";
    if (index === 2) numColor = "text-gray-300";
    if (index === 3) numColor = "text-orange-500";

    return (
        <div className="flex items-center gap-4 group">
            <span className={`text-4xl font-bold w-12 text-center ${numColor} italic`}>
                {index}
            </span>
            <div className="flex-1">
                <MovieCard movie={video} className="horizontal" />
            </div>
        </div>
    );
}

function formatSourceName(source) {
    return source
        .split(/(?=[A-Z])|(?<=[a-z])(?=[A-Z])/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
}
