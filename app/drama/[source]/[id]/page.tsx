// =============================================================================
// Drama Detail Page - Source-aware drama details with episode list
// /drama/[source]/[id]
// =============================================================================

import { streamService } from "@/lib/services/StreamService";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 300; // ISR: 5 minutes

interface DramaPageProps {
    params: Promise<{
        source: string;
        id: string;
    }>;
}

export default async function DramaPage({ params }: DramaPageProps) {
    const { source, id } = await params;

    // Validate source
    if (!streamService.isSupported(source)) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Unsupported source: {source}</p>
            </div>
        );
    }

    const dramaRes = await streamService.getDrama(source as SourceType, id);
    const drama = dramaRes.data;

    if (!drama) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <p>Drama not found.</p>
            </div>
        );
    }

    const { episodes } = drama;

    return (
        <div className="min-h-screen pb-20">
            {/* Header / Backdrop */}
            <div className="relative w-full aspect-video md:h-[60vh] md:aspect-auto">
                <div className="absolute inset-0 bg-black/50" />
                <Image
                    src={drama.poster}
                    alt={drama.title}
                    fill
                    sizes="100vw"
                    className="object-cover opacity-50 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full container mx-auto px-4 md:px-6 pb-8 md:pb-12 flex flex-col md:flex-row gap-8 items-end">
                    <div className="hidden md:block relative w-48 aspect-[2/3] rounded-lg shadow-2xl z-10 overflow-hidden">
                        <Image
                            src={drama.poster}
                            alt={drama.title}
                            fill
                            sizes="192px"
                            priority
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded uppercase">
                                {source}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white">
                            {drama.title}
                        </h1>
                        <p className="text-white/80 line-clamp-3 max-w-2xl">
                            {drama.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm text-white/60">
                            {drama.genres?.map((g) => (
                                <span
                                    key={g}
                                    className="bg-white/10 px-2 py-1 rounded"
                                >
                                    {g}
                                </span>
                            ))}
                        </div>

                        {/* Play First Episode Button */}
                        {episodes.length > 0 && (
                            <Link
                                href={`/watch/${source}/${id}/${episodes[0].episodeNumber}`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors mt-4"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Watch Now
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 mt-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                    Episodes ({episodes.length})
                </h2>

                {episodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {episodes.map((ep) => (
                            <Link
                                href={`/watch/${source}/${id}/${ep.episodeNumber}`}
                                key={ep.id}
                                className="group bg-card border hover:bg-accent/50 rounded-lg p-4 transition-colors flex items-center gap-4 shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                    <Play className="w-4 h-4 fill-current" />
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">
                                        Episode {ep.episodeNumber}
                                    </div>
                                    {ep.title && (
                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                            {ep.title}
                                        </div>
                                    )}
                                    {ep.isLocked && (
                                        <div className="text-xs text-yellow-500">
                                            🔒 Locked
                                        </div>
                                    )}
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
