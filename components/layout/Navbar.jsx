"use client";

import Link from "next/link";
import { Search, Menu, X, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const isWatchPage = pathname?.startsWith("/watch");
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    if (isWatchPage) return null;

    return (
        <nav
            className={cn(
                "fixed top-0 z-50 w-full transition-all duration-300",
                isScrolled
                    ? "bg-background/80 backdrop-blur-md border-b border-white/10"
                    : "bg-gradient-to-b from-black/80 to-transparent"
            )}
        >
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <PlayCircle className="w-8 h-8 text-primary group-hover:text-primary/90 transition-colors" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            Strim
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            href="/"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            href="/trending"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Trending
                        </Link>
                        <Link
                            href="/movies"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Movies
                        </Link>
                        <Link
                            href="/series"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Series
                        </Link>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Link href="/search" className="p-2 text-white/70 hover:text-white transition-colors">
                            <Search className="w-5 h-5" />
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
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
                            href="/trending"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Trending
                        </Link>
                        <Link
                            href="/movies"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Movies
                        </Link>
                        <Link
                            href="/series"
                            className="block text-sm font-medium text-white/70 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Series
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
