"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    ArrowLeft,
    Settings,
    Play,
    Pause,
    ChevronUp,
    ChevronDown,
    Check,
    Subtitles,
    Heart,
    Bookmark,
    Share2,
    MoreVertical,
    X,
    MonitorPlay,
    ChevronRight,
    List
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Hls from "hls.js";
import { storageService, VideoItem } from "@/lib/services/StorageService";

// =============================================================================
// Types
// =============================================================================

interface StreamSource {
    quality: string;
    url: string;
    type: "hls" | "mp4" | "dash";
}

interface Subtitle {
    label: string;
    language: string;
    url: string;
}

interface Episode {
    id: string;
    episodeNumber: number;
    title?: string;
    thumbnail?: string;
}

interface VideoPlayerProps {
    streams: StreamSource[];
    subtitles?: Subtitle[];
    poster?: string;
    title: string;
    description?: string;
    source: string;
    dramaId: string;
    currentEpisodeNumber: number;
    episodes: Episode[];
    onEpisodeChange?: (episodeNumber: number) => void;
}

// =============================================================================
// VideoPlayer Component
// =============================================================================

export default function VideoPlayer({
    streams,
    subtitles = [],
    poster,
    title,
    description,
    source,
    dramaId,
    currentEpisodeNumber,
    episodes,
    onEpisodeChange,
}: VideoPlayerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isAutoPlay = searchParams.get('autoplay') === '1';

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Playback state
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // UI state - start hidden if auto-play
    const [showControls, setShowControls] = useState(!isAutoPlay);
    const [activeDrawer, setActiveDrawer] = useState<"episodes" | "settings" | null>(null);

    // User Data State
    const [isLiked, setIsLiked] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Touch handling for mobile swipe
    const [touchStart, setTouchStart] = useState<number | null>(null);

    // Long Press for Speed
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressingRef = useRef(false);
    const isAutoPlayingRef = useRef(false);
    const firstAutoPlayRef = useRef(isAutoPlay);

    // Quality & Subtitle state
    const [availableQualities, setAvailableQualities] = useState<
        { index: number; label: string; height: number }[]
    >([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState(-1); // -1 = auto
    const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);

    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ==========================================================================
    // Initialization & User Data
    // ==========================================================================
    useEffect(() => {
        // Load initial user data status
        const status = storageService.checkStatus(dramaId);
        setIsLiked(status.liked);
        setIsBookmarked(status.bookmarked);

        // Save to history
        storageService.addToHistory({
            id: dramaId,
            source,
            title,
            poster: poster || "",
            episodeNumber: currentEpisodeNumber,
            timestamp: Date.now()
        });
    }, [dramaId, source, title, poster, currentEpisodeNumber]);

    // ==========================================================================
    // Stream Selection
    // ==========================================================================
    const streamUrl = streams.length > 0 ? streams[0].url : null;
    const streamType = streams.length > 0 ? streams[0].type : "hls";

    // ==========================================================================
    // Auto-hide controls
    // ==========================================================================
    const resetControlsTimeout = useCallback((show: boolean = true) => {
        if (show) setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

        // Only auto-hide if playing and no drawer is open
        if (playing && !activeDrawer) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [playing, activeDrawer]);

    useEffect(() => {
        const handleInteraction = () => resetControlsTimeout();
        const container = containerRef.current;

        if (container) {
            container.addEventListener("mousemove", handleInteraction);
            container.addEventListener("click", handleInteraction);
            container.addEventListener("keydown", handleInteraction);
        }

        return () => {
            if (container) {
                container.removeEventListener("mousemove", handleInteraction);
                container.removeEventListener("click", handleInteraction);
                container.removeEventListener("keydown", handleInteraction);
            }
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [resetControlsTimeout]);

    useEffect(() => {
        if (playing) {
            // If it's the first auto-play, keep controls hidden
            if (firstAutoPlayRef.current) {
                resetControlsTimeout(false);
                firstAutoPlayRef.current = false;
            } else {
                resetControlsTimeout(true);
            }
            // Reset auto-play flag once new video starts
            isAutoPlayingRef.current = false;
        } else {
            // Don't show controls if auto-playing to next episode or waiting for initial auto-play
            if (!isAutoPlayingRef.current && !firstAutoPlayRef.current) {
                setShowControls(true);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            }
        }
    }, [playing, resetControlsTimeout]);

    // ==========================================================================
    // HLS / Video Source Handling
    // ==========================================================================
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) return;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (streamType === "hls" && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels.map((level, index) => ({
                    index,
                    height: level.height,
                    label: `${level.height}p`,
                }));
                setAvailableQualities(levels);
                video.play().catch(() => { });
                setPlaying(true);
            });
        } else {
            video.src = streamUrl;
            video.play().catch(() => { });
            setPlaying(true);
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamUrl, streamType]);

    // Update Playback Rate
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    // ==========================================================================
    // Navigation Logic
    // ==========================================================================
    const sortedEpisodes = [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
    const currentIndex = sortedEpisodes.findIndex((ep) => ep.episodeNumber === currentEpisodeNumber);
    const previousEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
    const nextEpisode = currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;

    const navigateToEpisode = (episodeNumber: number, autoplay: boolean = false) => {
        if (onEpisodeChange) {
            onEpisodeChange(episodeNumber);
        } else {
            const url = `/watch/${source}/${dramaId}/${episodeNumber}${autoplay ? '?autoplay=1' : ''}`;
            router.push(url);
        }
        setActiveDrawer(null); // Close drawer on nav
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (previousEpisode) navigateToEpisode(previousEpisode.episodeNumber);
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (nextEpisode) navigateToEpisode(nextEpisode.episodeNumber);
    };

    const handleVideoEnded = () => {
        // Auto-play next episode if available
        if (nextEpisode) {
            isAutoPlayingRef.current = true;
            navigateToEpisode(nextEpisode.episodeNumber, true);
        } else {
            setPlaying(false);
        }
    };

    // Auto-play when coming from previous episode
    useEffect(() => {
        if (isAutoPlay && videoRef.current) {
            const playVideo = () => {
                videoRef.current?.play().catch(() => { });
            };
            // Try to play when video is ready
            if (videoRef.current.readyState >= 2) {
                playVideo();
            } else {
                videoRef.current.addEventListener('canplay', playVideo, { once: true });
            }
        }
    }, [isAutoPlay]);

    // ==========================================================================
    // Event Handlers
    // ==========================================================================
    const togglePlay = (e?: React.MouseEvent | React.TouchEvent) => {
        // Prevent if clicking active controls or if long pressing
        if ((e?.target as HTMLElement).closest('button, a, .drawer-content')) return;
        if (isLongPressingRef.current) return;

        if (videoRef.current) {
            if (playing) videoRef.current.pause();
            else videoRef.current.play();
            setPlaying(!playing);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) setDuration(videoRef.current.duration);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };

    const switchQuality = (levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            setCurrentQualityIndex(levelIndex);
        }
    };

    const toggleLike = () => {
        const item: VideoItem = { id: dramaId, source, title, poster: poster || "", timestamp: Date.now() };
        const newState = storageService.toggleLike(item);
        setIsLiked(newState);
    };

    const toggleBookmark = () => {
        const item: VideoItem = { id: dramaId, source, title, poster: poster || "", timestamp: Date.now() };
        const newState = storageService.toggleBookmark(item);
        setIsBookmarked(newState);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: `Watch ${title}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log("Error sharing", err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    // ==========================================================================
    // Gestures (Swipe & Long Press)
    // ==========================================================================
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientY);

        // Long Press Start
        isLongPressingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            setPlaybackRate(2.0);
        }, 500); // 500ms hold to trigger speed up
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // Long Press End
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        if (isLongPressingRef.current) {
            setPlaybackRate(1.0);
            isLongPressingRef.current = false;
            return; // Don't trigger swipe or click if it was a long press
        }

        // Swipe Logic
        if (touchStart === null) return;
        const touchEnd = e.changedTouches[0].clientY;
        const diff = touchStart - touchEnd;

        // Swipe Up -> Next Episode
        if (diff > 50) handleNext();
        // Swipe Down -> Prev Episode
        if (diff < -50) handlePrev();

        setTouchStart(null);
    };

    const handleMouseDown = () => {
        isLongPressingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            setPlaybackRate(2.0);
        }, 500);
    };

    const handleMouseUp = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        if (isLongPressingRef.current) {
            setPlaybackRate(1.0);
            isLongPressingRef.current = false;
        }
    };

    // ==========================================================================
    // Render
    // ==========================================================================
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black overflow-hidden select-none font-sans"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Video Layer */}
            <video
                ref={videoRef}
                poster={poster}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                onEnded={handleVideoEnded}
                playsInline
                // Note: crossOrigin removed - DramaBox CDN doesn't support CORS for MP4 files
                // Only add crossOrigin when using subtitles with CORS-enabled sources
                {...(streamType === "hls" && subtitles.length > 0 ? { crossOrigin: "anonymous" } : {})}
            />

            {/* Speeed Up Indicator */}
            {playbackRate > 1 && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm z-50 flex items-center gap-1 animate-pulse">
                    <MonitorPlay className="w-3 h-3" /> Speed 2x
                </div>
            )}

            {/* ============================================================
               TOP BAR (Back & Settings)
               ============================================================ */}
            {/* ============================================================
               TOP BAR (Back & Settings)
               ============================================================ */}
            {/* Gradient Background (Fades with controls) */}
            <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-40 pointer-events-none">
                {/* Back Button (Always visible / Interactive / Semi-transparent when hidden) */}
                <Link
                    href={`/drama/${source}/${dramaId}`}
                    className={`p-2 bg-black/20 rounded-full text-white backdrop-blur-md pointer-events-auto active:scale-95 transition-all duration-300 ${showControls ? 'opacity-100 scale-100' : 'opacity-30 scale-90 hover:opacity-100 hover:scale-100'}`}
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                {/* Settings & Drawer Trigger */}
                <div className={`flex gap-3 pointer-events-auto transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <button
                        onClick={() => setActiveDrawer('settings')}
                        className="p-2 bg-black/20 rounded-full text-white backdrop-blur-md active:scale-95"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* ============================================================
               RIGHT ACTION STACK (Like, Bookmark, Share)
               ============================================================ */}
            <div className={`absolute right-4 bottom-32 flex flex-col gap-6 items-center z-40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Like */}
                <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-transform active:scale-95 group-hover:bg-black/40">
                        <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </div>
                    <span className="text-white text-xs drop-shadow-md">Like</span>
                </button>

                {/* Bookmark */}
                <button onClick={toggleBookmark} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-transform active:scale-95 group-hover:bg-black/40">
                        <Bookmark className={`w-7 h-7 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                    </div>
                    <span className="text-white text-xs drop-shadow-md">Save</span>
                </button>

                {/* Share */}
                <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-transform active:scale-95 group-hover:bg-black/40">
                        <Share2 className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-white text-xs drop-shadow-md">Share</span>
                </button>
            </div>


            {/* ============================================================
               BOTTOM INFO LAYER (Title, Desc, Progress)
               ============================================================ */}
            <div className="absolute bottom-0 left-0 w-full z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-4 pointer-events-none text-left">

                {/* Text Content (Fades out with controls) */}
                <div className={`mb-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-primary/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            EP {currentEpisodeNumber}
                        </span>
                    </div>
                    <h1 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-1 drop-shadow-sm text-left">
                        {title.replace(`Episode ${currentEpisodeNumber} - `, '')}
                    </h1>
                    {description && (
                        <p className="text-white/80 text-sm line-clamp-2 max-w-[85%] drop-shadow-sm leading-snug text-left">
                            {description}
                        </p>
                    )}
                </div>

                {/* Interactive Bottom Bar (Always Accessible) */}
                <div className="pointer-events-auto flex flex-col gap-3">
                    {/* Seek Bar & Time */}
                    <div className={`flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}>
                        <div className="relative flex-1 group flex items-center">
                            {/* Time Tooltip on Thumb */}
                            <div
                                className="absolute bottom-4 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 whitespace-nowrap mb-2"
                                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                            >
                                {formatTime(currentTime)}
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md relative z-10"
                            />
                        </div>
                        <span className="text-white/90 text-xs font-mono whitespace-nowrap">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Total Episode Button (Triggers Drawer) - VISIBLE ON MOBILE - FADES WITH CONTROLS */}
                    <button
                        onClick={() => setActiveDrawer('episodes')}
                        className={`flex items-center justify-between w-full bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg px-4 py-3 transition-colors duration-300 group ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <div className="flex items-center gap-3">
                            <List className="w-5 h-5 text-white/70" />
                            <span className="text-white text-sm font-medium">
                                Total {episodes.length} episodes
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Desktop Vertical Navigation (Hidden on Touch devices ideally, but kept for desktop access) */}
            <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-4 z-40">
                <button
                    onClick={handlePrev}
                    disabled={!previousEpisode}
                    className={`p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all ${!previousEpisode ? 'opacity-30' : ''}`}
                >
                    <ChevronUp className="w-6 h-6" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={!nextEpisode}
                    className={`p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all ${!nextEpisode ? 'opacity-30' : ''}`}
                >
                    <ChevronDown className="w-6 h-6" />
                </button>
            </div>

            {/* Play/Pause Overlay Indicator (Center) */}
            {!playing && activeDrawer === null && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="p-6 bg-black/40 rounded-full backdrop-blur-md animate-in zoom-in fade-in duration-200">
                        <Play className="w-12 h-12 text-white fill-white" />
                    </div>
                </div>
            )}

            {/* ============================================================
               DRAWERS (Bottom Sheets)
               ============================================================ */}

            {/* Backdrop */}
            {activeDrawer && (
                <div
                    className="absolute inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
                    onClick={() => setActiveDrawer(null)}
                />
            )}

            {/* Episodes Drawer */}
            <div
                className={`absolute bottom-0 left-0 w-full bg-[#1a1a1a] rounded-t-2xl z-50 transition-transform duration-300 ease-out max-h-[70vh] flex flex-col ${activeDrawer === 'episodes' ? 'translate-y-0' : 'translate-y-full'}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-bold">Total {episodes.length} Episodes</h3>
                    <button onClick={() => setActiveDrawer(null)} className="p-1 text-white/50 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 drawer-content">
                    {sortedEpisodes.map((ep) => (
                        <button
                            key={ep.episodeNumber}
                            onClick={() => navigateToEpisode(ep.episodeNumber)}
                            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${ep.episodeNumber === currentEpisodeNumber
                                ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/20'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:scale-105'
                                }`}
                        >
                            {ep.episodeNumber}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Drawer */}
            <div
                className={`absolute bottom-0 left-0 w-full bg-[#1a1a1a] rounded-t-2xl z-50 transition-transform duration-300 ease-out max-h-[60vh] flex flex-col ${activeDrawer === 'settings' ? 'translate-y-0' : 'translate-y-full'}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-bold">Settings</h3>
                    <button onClick={() => setActiveDrawer(null)} className="p-1 text-white/50 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-6 drawer-content [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {/* Speed */}
                    <div>
                        <h4 className="text-white/50 text-xs font-bold uppercase mb-3">Playback Speed</h4>
                        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                                <button
                                    key={rate}
                                    onClick={() => setPlaybackRate(rate)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${playbackRate === rate ? 'bg-primary text-white' : 'bg-white/10 text-white'
                                        }`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quality */}
                    {availableQualities.length > 0 && (
                        <div>
                            <h4 className="text-white/50 text-xs font-bold uppercase mb-3">Quality</h4>
                            <div className="w-full">
                                <select
                                    value={currentQualityIndex}
                                    onChange={(e) => switchQuality(Number(e.target.value))}
                                    className="w-full bg-white/10 text-white rounded-lg p-3 appearance-none outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    <option value={-1} className="bg-[#1a1a1a] text-white">Auto Quality</option>
                                    {availableQualities.map(q => (
                                        <option key={q.index} value={q.index} className="bg-[#1a1a1a] text-white">
                                            {q.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Subtitles */}
                    {subtitles.length > 0 && (
                        <div>
                            <h4 className="text-white/50 text-xs font-bold uppercase mb-3">Subtitles</h4>
                            <div className="w-full">
                                <select
                                    value={currentSubtitle || ""}
                                    onChange={(e) => setCurrentSubtitle(e.target.value === "" ? null : e.target.value)}
                                    className="w-full bg-white/10 text-white rounded-lg p-3 appearance-none outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    <option value="" className="bg-[#1a1a1a] text-white">Off</option>
                                    {subtitles.map(sub => (
                                        <option key={sub.language} value={sub.language} className="bg-[#1a1a1a] text-white">
                                            {sub.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
