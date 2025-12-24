import DramaDash from "@/lib/api/dramaDash";
import Link from "next/link";
import { Play } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DramaPage({ params }) {
    const { id } = await params;
    const dd = new DramaDash();
    await dd.init();
    const dramaData = await dd.getDrama(id);

    const { data: drama, episodes } = dramaData;

    if (!drama) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Drama not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header / Backdrop */}
            <div className="relative w-full aspect-video md:h-[60vh] md:aspect-auto">
                <div className="absolute inset-0 bg-black/50" />
                <img
                    src={drama.poster}
                    alt={drama.name}
                    className="w-full h-full object-cover opacity-50 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full container mx-auto px-4 md:px-6 pb-8 md:pb-12 flex flex-col md:flex-row gap-8 items-end">
                    <img
                        src={drama.poster}
                        alt={drama.name}
                        className="hidden md:block w-48 rounded-lg shadow-2xl z-10"
                    />
                    <div className="flex-1 space-y-4">
                        <h1 className="text-3xl md:text-5xl font-bold text-white">{drama.name}</h1>
                        <p className="text-white/80 line-clamp-3 max-w-2xl">{drama.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-white/60">
                            {drama.genres && drama.genres.map(g => (
                                <span key={g} className="bg-white/10 px-2 py-1 rounded">{g}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 mt-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">Episodes</h2>

                {episodes && episodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {episodes.map((ep) => (
                            <Link
                                href={`/watch/${id}/${ep.episodeNumber}`}
                                key={ep.id}
                                className="group bg-card border hover:bg-accent/50 rounded-lg p-4 transition-colors flex items-center gap-4 shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                    <Play className="w-4 h-4 fill-current" />
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">Episode {ep.episodeNumber}</div>
                                    <div className="text-xs text-muted-foreground">{ep.isWatched ? "Watched" : "Not watched"}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No episodes available.</p>
                )}
            </div>
        </div>
    );
}
