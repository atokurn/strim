import DramaDash from "@/lib/api/dramaDash";
import VideoPlayer from "@/components/watch/VideoPlayer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WatchPage({ params }) {
    const { id, episode } = await params;
    const dd = new DramaDash();
    await dd.init();

    // Fetch full drama details to get all episodes list + current episode info
    // This is more efficient for our new UI which needs the episode list
    const dramaData = await dd.getDrama(id);
    const { data: dramaInfo, episodes } = dramaData;

    // Helper to find episode safely with type conversion
    const currentEpNum = parseInt(episode, 10);
    const cursorEpisode = episodes?.find((e) => e.episodeNumber === currentEpNum);

    if (!cursorEpisode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <p>Failed to load episode.</p>
                <Link href={`/drama/${id}`} className="text-primary hover:underline">Return to Drama Details</Link>
            </div>
        );
    }

    return (
        <VideoPlayer
            videoUrl={cursorEpisode.videoUrl}
            poster={dramaInfo?.poster}
            title={`Episode ${currentEpNum} - ${dramaInfo?.name}`}
            dramaId={id}
            episodes={episodes}
            currentEpisodeNumber={currentEpNum}
        />
    );
}
