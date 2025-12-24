export interface VideoItem {
    id: string; // dramaId
    source: string;
    title: string;
    poster: string;
    episodeNumber?: number;
    url?: string;
    timestamp: number;
}

const STORAGE_KEYS = {
    HISTORY: 'strim_history',
    BOOKMARKS: 'strim_bookmarks',
    LIKES: 'strim_likes',
};

export const storageService = {
    // Helpers
    _getItems: (key: string): VideoItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : [];
        } catch (e) {
            console.error('Error reading from storage', e);
            return [];
        }
    },

    _saveItems: (key: string, items: VideoItem[]) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(key, JSON.stringify(items));
        } catch (e) {
            console.error('Error saving to storage', e);
        }
    },

    // History
    addToHistory: (video: VideoItem) => {
        const history = storageService._getItems(STORAGE_KEYS.HISTORY);
        // Remove existing entry for same drama to push to top
        const filtered = history.filter(item => item.id !== video.id);
        const newHistory = [video, ...filtered].slice(0, 50); // Keep last 50
        storageService._saveItems(STORAGE_KEYS.HISTORY, newHistory);
    },

    getHistory: (): VideoItem[] => {
        return storageService._getItems(STORAGE_KEYS.HISTORY);
    },

    // Bookmarks
    toggleBookmark: (video: VideoItem): boolean => {
        const bookmarks = storageService._getItems(STORAGE_KEYS.BOOKMARKS);
        const exists = bookmarks.some(item => item.id === video.id);
        let newBookmarks;

        if (exists) {
            newBookmarks = bookmarks.filter(item => item.id !== video.id);
        } else {
            newBookmarks = [video, ...bookmarks];
        }

        storageService._saveItems(STORAGE_KEYS.BOOKMARKS, newBookmarks);
        return !exists; // Return new state (true = bookmarked)
    },

    getBookmarks: (): VideoItem[] => {
        return storageService._getItems(STORAGE_KEYS.BOOKMARKS);
    },

    isBookmarked: (id: string): boolean => {
        return storageService._getItems(STORAGE_KEYS.BOOKMARKS).some(item => item.id === id);
    },

    // Likes
    toggleLike: (video: VideoItem): boolean => {
        const likes = storageService._getItems(STORAGE_KEYS.LIKES);
        const exists = likes.some(item => item.id === video.id);
        let newLikes;

        if (exists) {
            newLikes = likes.filter(item => item.id !== video.id);
        } else {
            newLikes = [video, ...likes];
        }

        storageService._saveItems(STORAGE_KEYS.LIKES, newLikes);
        return !exists;
    },

    getLikes: (): VideoItem[] => {
        return storageService._getItems(STORAGE_KEYS.LIKES);
    },

    isLiked: (id: string): boolean => {
        return storageService._getItems(STORAGE_KEYS.LIKES).some(item => item.id === id);
    },

    // Check status for UI initialization
    checkStatus: (id: string) => {
        return {
            bookmarked: storageService.isBookmarked(id),
            liked: storageService.isLiked(id)
        };
    }
};
