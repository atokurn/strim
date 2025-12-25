"use client";

import Link from "next/link";
import { Search, Menu, X, PlayCircle, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { storageService } from "@/lib/services/StorageService";

function HistoryList() {
    const [history, setHistory] = useState([]);

    const loadHistory = () => {
        const items = storageService.getHistory();
        setHistory(items.slice(0, 5));
    };

    useEffect(() => {
        loadHistory();
        // Listen for custom event to refresh history on hover
        window.addEventListener('check-history', loadHistory);
        return () => window.removeEventListener('check-history', loadHistory);
    }, []);

    if (history.length === 0) {
        return (
            <div className="p-8 text-center text-white/40 text-xs">
                Belum ada riwayat tontonan
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {history.map((item) => (
                <Link
                    key={`${item.id}-${item.timestamp}`}
                    href={item.episodeNumber
                        ? `/watch/${item.source}/${item.id}/${item.episodeNumber}`
                        : `/drama/${item.source}/${item.id}`
                    }
                    className="flex gap-3 p-3 hover:bg-white/5 transition-colors group/item"
                >
                    <div className="w-20 aspect-video relative rounded overflow-hidden flex-shrink-0 bg-white/10">
                        <img
                            src={item.poster || "/placeholder.png"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 bg-black/40 transition-opacity">
                            <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                        {/* Progress bar line at bottom */}
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20">
                            <div className="h-full bg-[#C2410C] w-1/2" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-medium text-white/90 line-clamp-2 leading-snug mb-1 group-hover/item:text-[#C2410C] transition-colors">
                            {item.title}
                        </h4>
                        <p className="text-xs text-white/50">
                            {item.episodeNumber ? `Lanjut: Episode ${item.episodeNumber}` : "Lanjutkan"}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Effect for scroll detection - must be before any early returns
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Hide Navbar on video playback pages - now AFTER all hooks
    if (pathname?.startsWith("/watch")) return null;

    return (
        <nav
            className={cn(
                "fixed top-0 z-50 w-full transition-all duration-300 hidden md:block",
                isScrolled
                    ? "bg-background/95 backdrop-blur-md border-b border-white/10"
                    : "bg-gradient-to-b from-black/90 to-transparent"
            )}
        >
            <div className="mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between gap-4">
                    {/* Left: Logo & Main Nav */}
                    <div className="flex items-center gap-8 overflow-hidden">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
                            <PlayCircle className="w-8 h-8 text-primary group-hover:text-primary/90 transition-colors" />
                            <span className="text-2xl font-bold italic text-white">
                                Strim
                            </span>
                        </Link>

                        {/* Desktop Navigation - Reference Style */}
                        <div className="hidden md:flex items-center gap-6 overflow-x-auto no-scrollbar mask-linear-fade">
                            {[
                                { label: "Untukmu", active: true },
                                { label: "Micro Drama 💖" },
                                { label: "Indonesia" },
                                { label: "Mandarin" },
                                { label: "Anime" },
                                { label: "Mini Series" },
                                { label: "Kolosal" },
                                { label: "VarShow" },
                                { label: "Film" },
                                { label: "Korea" },
                                { label: "Anak" }
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    href={`/explore?cat=${item.label}`}
                                    className={`text-[14px] font-medium whitespace-nowrap transition-colors ${item.active ? "text-[#C2410C] font-bold" : "text-white/70 hover:text-white"
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-5 flex-shrink-0">
                        {/* Eksplorasi Link with Icon */}
                        <Link href="/explore" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="7" height="7" x="3" y="3" rx="1" />
                                <rect width="7" height="7" x="14" y="3" rx="1" />
                                <rect width="7" height="7" x="14" y="14" rx="1" />
                                <rect width="7" height="7" x="3" y="14" rx="1" />
                            </svg>
                            <span className="text-sm font-medium">Eksplorasi</span>
                        </Link>

                        {/* Search Bar Pill */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari..."
                                className="bg-[#2D2D2D] text-white/90 text-sm rounded-full pl-4 pr-10 py-1.5 w-48 border border-white/10 focus:outline-none focus:border-white/30 transition-all placeholder:text-white/40"
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C2410C]" />
                        </div>

                        {/* History Icon & Popup */}
                        <div
                            className="relative group"
                            onMouseEnter={() => matchMedia('(min-width: 768px)').matches && window.dispatchEvent(new CustomEvent('check-history'))}
                        >
                            <div className="text-white/70 hover:text-white transition-colors block py-2 cursor-default">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>

                            {/* Popup Content with Gap Bridge & Exit Delay */}
                            <div
                                className="absolute top-full right-0 pt-4 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:visible hover:opacity-100 transition-all duration-200 delay-500 group-hover:delay-0 translate-y-2 group-hover:translate-y-0 z-50"
                                onMouseEnter={() => document.body.style.overflow = 'hidden'}
                                onMouseLeave={() => document.body.style.overflow = ''}
                            >
                                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-white font-bold text-sm">Riwayat Tontonan</span>
                                        <Link href="/library?tab=history" className="text-xs text-[#C2410C] hover:text-[#d55f2c]">Lihat Semua</Link>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto no-scrollbar overscroll-contain">
                                        <HistoryList />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* VIP/Profile Icon */}
                        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C2410C]">
                                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                <path d="m3.3 7 8.7 5 8.7-5" />
                                <path d="M12 22V12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-background border-b border-white/10">
                    <div className="px-4 py-4 space-y-4">
                        <Link
                            href="/"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            href="/explore"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Eksplorasi
                        </Link>
                        <Link
                            href="/trending"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Trending
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
