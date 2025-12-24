// =============================================================================
// Watch Page - Source-aware episode player
// /watch/[source]/[id]/[episode]
// =============================================================================

import { streamService } from "@/lib/services/StreamService";
import VideoPlayer from "@/components/watch/VideoPlayer";
import Link from "next/link";
import type { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface WatchPageProps {
    params: Promise<{
        source: string;
        id: string;
        episode: string;
    }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
    const { source, id, episode } = await params;

    // Validate source
    if (!streamService.isSupported(source)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <p className="text-xl">Unsupported source: {source}</p>
                <Link href="/" className="text-primary hover:underline">
                    Return to Home
                </Link>
            </div>
        );
    }

    const episodeNumber = parseInt(episode, 10);
    if (isNaN(episodeNumber)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <p className="text-xl">Invalid episode number</p>
                <Link href={`/drama/${source}/${id}`} className="text-primary hover:underline">
                    Return to Drama Details
                </Link>
            </div>
        );
    }

    // Fetch drama details to get episode list and current episode
    const dramaRes = await streamService.getDrama(source as SourceType, id);

    if (!dramaRes.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <p className="text-xl">Failed to load drama</p>
                <p className="text-white/50">{dramaRes.error}</p>
                <Link href="/" className="text-primary hover:underline">
                    Return to Home
                </Link>
            </div>
        );
    }

    const { episodes, title, poster } = dramaRes.data;

    // Find the current episode
    const currentEpisode = episodes.find((ep) => ep.episodeNumber === episodeNumber);

    if (!currentEpisode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <p className="text-xl">Episode {episodeNumber} not found</p>
                <Link href={`/drama/${source}/${id}`} className="text-primary hover:underline">
                    Return to Drama Details
                </Link>
            </div>
        );
    }

    // Prepare episode list for the player
    const episodeList = episodes.map((ep) => ({
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        thumbnail: ep.thumbnail,
    }));

    return (
        <div className="fixed inset-0 bg-black z-50">
            <VideoPlayer
                streams={currentEpisode.streams}
                subtitles={currentEpisode.subtitles}
                poster={poster}
                title={`Episode ${episodeNumber} - ${title}`}
                description={dramaRes.data.description}
                source={source}
                dramaId={id}
                currentEpisodeNumber={episodeNumber}
                episodes={episodeList}
            />
        </div>
    );
}
