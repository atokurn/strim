import DramaDash from "@/lib/api/dramaDash";
import MovieCard from "@/components/shared/MovieCard";
import { Search as SearchIcon } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SearchPage({ searchParams }) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    let results = [];

    if (query) {
        const dd = new DramaDash();
        await dd.init();
        const searchData = await dd.searchDrama(query);
        results = searchData.data || [];
    }

    async function searchAction(formData) {
        "use server";
        const q = formData.get("q");
        if (q) {
            redirect(`/search?q=${encodeURIComponent(q)}`);
        }
    }

    return (
        <div className="container mx-auto px-4 md:px-6 pt-24 min-h-screen">
            <div className="max-w-2xl mx-auto mb-12">
                <form action={searchAction} className="relative">
                    <input
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Search for dramas, movies, or shows..."
                        className="w-full bg-secondary/50 border border-white/10 rounded-full px-6 py-4 pl-14 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        autoFocus
                    />
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                </form>
            </div>

            {query && (
                <div className="space-y-6">
                    <h2 className="text-xl font-medium text-white/80">
                        Search results for <span className="text-white">"{query}"</span>
                    </h2>

                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {results.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-white/40">
                            No results found. Try searching for something else.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
