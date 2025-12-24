"use client";

import { useState, useRef, useEffect } from "react";
import {
    ArrowLeft,
    Settings,
    maximize,
    Minimize,
    Play,
    Pause,
    SkipForward,
    Grid,
    Maximize
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VideoPlayer({
    videoUrl,
    poster,
    title,
    dramaId,
    episodes,
    currentEpisodeNumber
}) {
    const router = useRouter();
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const [playing, setPlaying] = useState(false); // Auto-play handled via prop but state sync needed
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showEpisodeMenu, setShowEpisodeMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const controlsTimeoutRef = useRef(null);

    // Auto-hide controls
    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (playing && !showEpisodeMenu && !showSettings) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    useEffect(() => {
        const handleMouseMove = () => resetControlsTimeout();
        const container = containerRef.current;
        if (container) {
            container.addEventListener("mousemove", handleMouseMove);
            container.addEventListener("click", handleMouseMove);
        }
        return () => {
            if (container) {
                container.removeEventListener("mousemove", handleMouseMove);
                container.removeEventListener("click", handleMouseMove);
            }
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [playing, showEpisodeMenu, showSettings]);

    // Video Event Handlers
    const togglePlay = (e) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (playing) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setPlaying(!playing);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            // Auto play on load if needed, strict browser policies might block unmuted autoplay
            videoRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Enter Fullscreen
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            } else if (containerRef.current.webkitRequestFullscreen) {
                containerRef.current.webkitRequestFullscreen();
            } else if (containerRef.current.mozRequestFullScreen) {
                containerRef.current.mozRequestFullScreen();
            } else if (containerRef.current.msRequestFullscreen) {
                containerRef.current.msRequestFullscreen();
            } else if (videoRef.current.webkitEnterFullscreen) {
                // iOS Fallback (Video element only)
                videoRef.current.webkitEnterFullscreen();
            }
            setIsFullscreen(true);
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };

    // Next Episode Logic
    const nextEpisode = episodes.find(e => e.episodeNumber > currentEpisodeNumber);
    const handleNextEpisode = () => {
        if (nextEpisode) {
            router.push(`/watch/${dramaId}/${nextEpisode.episodeNumber}`);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden"
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={videoUrl}
                poster={poster}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                onEnded={() => setPlaying(false)}
                playsInline
            />

            {/* Overlays */}

            {/* Top Gradient */}
            <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-10 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`} />

            {/* Bottom Gradient */}
            <div className={`absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 z-10 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`} />

            {/* Top Bar Controls */}
            <div className={`absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20 transition-opacity duration-300 ${showControls ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                <div className="flex items-center gap-4">
                    <Link href={`/drama/${dramaId}`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-white font-medium text-lg drop-shadow-md">{title}</h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Resolution Settings Mock */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        {showSettings && (
                            <div className="absolute top-10 right-0 bg-black/90 border border-white/10 rounded-lg p-2 min-w-[120px] shadow-xl">
                                <div className="text-xs text-white/50 mb-2 px-2 uppercase font-bold">Quality</div>
                                <button className="w-full text-left px-2 py-1.5 text-sm text-green-400 bg-white/10 rounded hover:bg-white/20 mb-1">1080p</button>
                                <button className="w-full text-left px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 rounded mb-1">720p</button>
                                <button className="w-full text-left px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 rounded">540p</button>
                            </div>
                        )}
                    </div>

                    {/* Episode Menu Toggle */}
                    <button
                        onClick={() => setShowEpisodeMenu(true)}
                        className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                        title="Episodes"
                    >
                        <Grid className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                        title="Fullscreen"
                    >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Center Play Button */}
            {!playing && (
                <button
                    onClick={togglePlay}
                    className="absolute z-20 p-6 bg-black/50 hover:bg-primary/80 rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110"
                >
                    <Play className="w-10 h-10 fill-current ml-1" />
                </button>
            )}

            {/* Bottom Controls */}
            <div className={`absolute bottom-0 left-0 w-full p-4 md:p-6 z-20 space-y-2 transition-opacity duration-300 ${showControls ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-white font-mono min-w-[40px] text-right drop-shadow-md">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        style={{
                            background: `linear-gradient(to right, var(--primary) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`
                        }}
                    />
                    <span className="text-xs text-white font-mono min-w-[40px] drop-shadow-md">{formatTime(duration)}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                            {playing ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                        </button>
                        <div className="text-white/80 text-sm font-medium hidden md:block">{title}</div>
                    </div>

                    <div className="flex items-center gap-4">
                        {nextEpisode ? (
                            <button
                                onClick={handleNextEpisode}
                                className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-primary/80 rounded-full text-sm font-medium text-white backdrop-blur-sm transition-all"
                            >
                                <span>Next Ep</span>
                                <SkipForward className="w-4 h-4 fill-current" />
                            </button>
                        ) : (
                            <span className="text-white/50 text-sm italic pr-4">Last Episode</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Episode Overlay Menu */}
            {showEpisodeMenu && (
                <div className="absolute inset-0 z-30 bg-black/95 flex flex-col p-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-white">Episodes</h2>
                        <button
                            onClick={() => setShowEpisodeMenu(false)}
                            className="p-2 hover:bg-white/20 rounded-full text-white"
                        >
                            <Minimize className="w-6 h-6 rotate-45" /> {/* Close icon using rotated plus/minimize */}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 overflow-y-auto pr-2 pb-20 custom-scrollbar">
                        {episodes.map((ep) => (
                            <Link
                                key={ep.id}
                                href={`/watch/${dramaId}/${ep.episodeNumber}`}
                                onClick={() => setShowEpisodeMenu(false)} // Close on select
                                className={`aspect-square flex items-center justify-center rounded-lg border transition-all ${ep.episodeNumber === currentEpisodeNumber
                                    ? "bg-white text-black border-white font-bold scale-105"
                                    : "bg-white/5 border-white/10 text-white hover:bg-white/20 hover:border-white/50"
                                    }`}
                            >
                                {ep.episodeNumber}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
