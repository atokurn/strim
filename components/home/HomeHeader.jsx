"use client";

import Link from "next/link";
import { Search, Cast } from "lucide-react";

export default function HomeHeader() {
    return (
        <div className="sticky top-0 z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent pb-4 pt-4 px-4">
            {/* Top Row: Search + Actions */}
            <div className="flex items-center gap-3">
                {/* Logo/Icon placeholder or just search bar focus */}
                <div className="flex-1 relative">
                    <Link href="/search" className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                        <Search className="w-4 h-4 text-white/70" />
                        <span className="text-sm text-white/70 font-medium">Battle Through T... | Jelajah</span>
                    </Link>
                </div>

                <button className="text-white/80">
                    <Cast className="w-5 h-5" />
                </button>

                <button className="bg-[#EDB359] text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    + VIP
                </button>
            </div>
        </div>
    );
}
