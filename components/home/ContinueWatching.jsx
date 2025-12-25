"use client";

import { useEffect, useState } from "react";
import { Play, ChevronRight } from "lucide-react";
import Link from "next/link";
import { storageService } from "@/lib/services/StorageService";

export default function ContinueWatching() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Load history from local storage
        const items = storageService.getHistory();
        setHistory(items.slice(0, 5)); // Show top 5
    }, []);

    if (history.length === 0) return null;

    return (
        <section className="mt-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Lanjut Tonton <Play className="w-4 h-4 fill-orange-500 text-orange-500" />
                </h2>
                <Link href="/library" className="text-white/50">
                    <ChevronRight className="w-5 h-5" />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {history.map((item) => (
                    <Link
                        key={`${item.id}-${item.timestamp}`}
                        href={item.episodeNumber
                            ? `/watch/${item.source}/${item.id}/${item.episodeNumber}`
                            : `/drama/${item.source}/${item.id}`
                        }
                        className="flex-shrink-0 w-64 relative group rounded-lg overflow-hidden bg-white/5"
                    >
                        <div className="flex">
                            <div className="w-28 aspect-video relative">
                                <img
                                    src={item.poster || "/placeholder.png"}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white fill-white/80" />
                                </div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                                <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-white/50">
                                    {item.episodeNumber ? `Episode ${item.episodeNumber}` : "Continue"}
                                </p>
                            </div>
                        </div>
                        {/* Progress Bar (Fake for now as we don't track exact timestamp %) */}
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/10">
                            <div className="h-full bg-orange-500 w-1/2" />
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
