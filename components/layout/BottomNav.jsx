"use client";
import Link from "next/link";
import { Home, Search, Library, Compass } from "lucide-react";
import { usePathname } from "next/navigation";

export default function BottomNav() {
    const pathname = usePathname();

    if (pathname.startsWith('/watch')) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-md border-t border-white/10 z-50 md:hidden flex justify-around items-center h-16 pb-safe">
            <Link href="/" className={`flex flex-col items-center gap-1 p-2 ${pathname === '/' ? 'text-[#C2410C]' : 'text-white/50'}`}>
                <Home className="w-6 h-6" />
                <span className="text-[10px]">Home</span>
            </Link>
            <Link href="/explore" className={`flex flex-col items-center gap-1 p-2 ${pathname.startsWith('/explore') ? 'text-[#C2410C]' : 'text-white/50'}`}>
                <Compass className="w-6 h-6" />
                <span className="text-[10px]">Eksplorasi</span>
            </Link>
            <Link href="/search" className={`flex flex-col items-center gap-1 p-2 ${pathname.startsWith('/search') ? 'text-[#C2410C]' : 'text-white/50'}`}>
                <Search className="w-6 h-6" />
                <span className="text-[10px]">Search</span>
            </Link>
            <Link href="/library" className={`flex flex-col items-center gap-1 p-2 ${pathname.startsWith('/library') ? 'text-[#C2410C]' : 'text-white/50'}`}>
                <Library className="w-6 h-6" />
                <span className="text-[10px]">Library</span>
            </Link>
        </div>
    )
}
