import DramaDash from "@/lib/api/dramaDash";
import HeroSection from "@/components/home/HeroSection";
import MovieCard from "@/components/shared/MovieCard";

// export const revalidate = 3600; // Removed to avoid build timeout
export const dynamic = "force-dynamic";

export default async function Home() {
    const dd = new DramaDash();
    await dd.init();
    const homeData = await dd.getHome();

    const { data } = homeData;

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Failed to load data. Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <HeroSection banners={data.banner} />

            <div className="container mx-auto px-4 md:px-6 relative z-10 -mt-20 md:-mt-32 space-y-12">
                {/* Trending Section */}
                {data.trending && data.trending.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Trending Now</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {data.trending.map((movie, index) => (
                                <MovieCard key={`trending-${movie.id}-${index}`} movie={movie} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Drama Section (or Recents/Popular usually) */}
                {data.drama && data.drama.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6">Popular Dramas</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {data.drama.map((movie, index) => (
                                <MovieCard key={`drama-${movie.id}-${index}`} movie={movie} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
