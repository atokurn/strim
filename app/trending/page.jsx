import DramaDash from "@/lib/api/dramaDash";
import MovieCard from "@/components/shared/MovieCard";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
    const dd = new DramaDash();
    await dd.init();
    // Using generic tab ID for Trending or similar if specific ID is known. 
    // Based on doc, Trending is ID 3.
    const trendingData = await dd.getTabs(3);

    const { data: movies } = trendingData;

    return (
        <div className="container mx-auto px-4 md:px-6 pt-24 min-h-screen">
            <h1 className="text-3xl font-bold text-white mb-8">Trending Now</h1>

            {movies && movies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            ) : (
                <div className="text-white/50">No trending dramas found at the moment.</div>
            )}
        </div>
    );
}
