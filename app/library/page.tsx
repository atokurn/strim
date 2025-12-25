"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, Bookmark, Play, Trash2 } from "lucide-react";
import { storageService, VideoItem } from "@/lib/services/StorageService";

export default function LibraryPage() {
    const [activeTab, setActiveTab] = useState<"history" | "bookmarks" | "likes">("history");
    const [items, setItems] = useState<VideoItem[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData(activeTab);
    }, [activeTab]);

    const loadData = (tab: "history" | "bookmarks" | "likes") => {
        switch (tab) {
            case "history":
                setItems(storageService.getHistory());
                break;
            case "bookmarks":
                setItems(storageService.getBookmarks());
                break;
            case "likes":
                setItems(storageService.getLikes());
                break;
        }
    };

    if (!mounted) return null; // Avoid hydration mismatch

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            {/* Header */}
            <header className="fixed top-0 left-0 w-full z-40 md:z-40 bg-black/80 backdrop-blur-lg border-b border-white/10 pt-4 md:top-16">


                {/* Tabs */}
                <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === "history"
                            ? "border-[#C2410C] text-[#C2410C]"
                            : "border-transparent text-white/60 hover:text-white"
                            }`}
                    >
                        <Clock className="w-4 h-4" /> Riwayat
                    </button>
                    <button
                        onClick={() => setActiveTab("bookmarks")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === "bookmarks"
                            ? "border-[#C2410C] text-[#C2410C]"
                            : "border-transparent text-white/60 hover:text-white"
                            }`}
                    >
                        <Bookmark className="w-4 h-4" /> Koleksi
                    </button>
                    <button
                        onClick={() => setActiveTab("likes")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === "likes"
                            ? "border-[#C2410C] text-[#C2410C]"
                            : "border-transparent text-white/60 hover:text-white"
                            }`}
                    >
                        <Heart className="w-4 h-4" /> Disukai
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="pt-32 px-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                        {activeTab === "history" && <Clock className="w-16 h-16 mb-4 opacity-50" />}
                        {activeTab === "bookmarks" && <Bookmark className="w-16 h-16 mb-4 opacity-50" />}
                        {activeTab === "likes" && <Heart className="w-16 h-16 mb-4 opacity-50" />}
                        <p>Belum ada item di {activeTab === "history" ? "riwayat" : activeTab === "bookmarks" ? "koleksi" : "disukai"}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                            <Link
                                key={`${item.id}-${item.timestamp}`}
                                href={activeTab === 'history' && item.episodeNumber
                                    ? `/watch/${item.source}/${item.id}/${item.episodeNumber}`
                                    : `/drama/${item.source}/${item.id}`
                                }
                                className="group relative aspect-[2/3] bg-white/5 rounded-lg overflow-hidden block"
                            >
                                <img
                                    src={item.poster}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                                    <h3 className="text-sm font-medium line-clamp-2 leading-tight">
                                        {item.title}
                                    </h3>
                                    {activeTab === "history" && item.episodeNumber && (
                                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                            <Play className="w-3 h-3 fill-current" />
                                            Episode {item.episodeNumber}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
