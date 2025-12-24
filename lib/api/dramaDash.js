import axios from "axios";
import { v4 as uuidv4 } from "uuid";

class DramaDash {
    constructor() {
        this.apiUrl = "https://www.dramadash.app/api/";
        this.deviceId = this.generateDeviceId();
        this.deviceToken = null;
        this.client = null;
    }

    generateDeviceId() {
        return uuidv4().replace(/-/g, "").substring(0, 16);
    }

    getDefaultHeaders() {
        return {
            "app-version": "70",
            "lang": "id",
            "platform": "android",
            "tz": "Asia/Bangkok",
            "device-type": "phone",
            "content-type": "application/json; charset=UTF-8",
            "accept-encoding": "gzip",
            "user-agent": "okhttp/5.1.0",
            ...(this.deviceToken && { authorization: `Bearer ${this.deviceToken}` }),
        };
    }

    async request(endpoint, method = "GET", data = null) {
        const config = {
            url: `${this.apiUrl}${endpoint}`,
            method,
            headers: this.getDefaultHeaders(),
            timeout: 15000,
            ...(data && { data }),
        };

        try {
            const res = await axios(config);
            return res.data;
        } catch (err) {
            console.error(
                `Request failed [${method} ${endpoint}]:`,
                err?.response?.data || err.message
            );
            throw err;
        }
    }

    async getToken() {
        const payload = { android_id: this.deviceId };
        const res = await this.request("landing", "POST", payload);
        return res?.token || null;
    }

    async init() {
        try {
            this.deviceToken = await this.getToken();
        } catch (error) {
            console.error("Failed to get token:", error.message);
        }
        return this;
    }

    async getHome() {
        try {
            const res = await this.request("home", "GET");
            const { dramaList, bannerDramaList, trendingSearches, tabs } = res;

            const dramaListFiltered = dramaList
                .filter((item) => Array.isArray(item.list))
                .flatMap((item) => item.list);

            const trending = trendingSearches.map((item) => ({
                id: item.id,
                name: item.name,
                poster: item.poster,
                genres: item.genres?.map((g) => g.displayName) || [],
            }));

            const banner = bannerDramaList?.list?.map((item) => ({
                id: item.id,
                name: item.name,
                poster: item.poster,
                desc: item.desc || "",
                viewCount: item.viewCount || 0,
                tags: item.tags ? item.tags.map((t) => t.displayName) : [],
                gendres: item.genres ? item.genres.map((g) => g.displayName) : [],
                genres: item.genres ? item.genres.map((g) => g.displayName) : [],
            })) || [];

            const drama = dramaListFiltered.map((item) => ({
                id: item.id,
                name: item.name,
                poster: item.poster,
                desc: item.desc || "",
                viewCount: item.viewCount || 0,
                tags: item.tags ? item.tags.map((t) => t.displayName) : [],
                gendres: item.genres ? item.genres.map((g) => g.displayName) : [],
            }));

            return {
                status: 200,
                data: { banner, trending, drama },
                tabs,
            };
        } catch (err) {
            console.error("Error fetching home:", err.message);
            return { status: 500, data: null, tabs: [] };
        }
    }

    async getTabs(tabId) {
        try {
            const res = await this.request(`home?tab_id=${tabId}`, "GET");

            // Transform response similar to getHome
            const dramaList = res.dramaList || [];
            const dramas = dramaList
                .filter((item) => Array.isArray(item.list))
                .flatMap((item) => item.list)
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    poster: item.poster,
                    viewCount: item.viewCount || 0,
                }));

            return { status: 200, data: dramas };
        } catch (err) {
            console.error("Error fetching tab:", err.message);
            return { status: 500, data: [] };
        }
    }

    async getDrama(dramaId) {
        try {
            const res = await this.request(`drama/${dramaId}`, "GET");
            const { drama } = res;

            return {
                status: 200,
                data: {
                    name: drama.name,
                    poster: drama.poster,
                    description: drama.description,
                    genres: drama.genres?.map((g) => g.displayName) || [],
                },
                episodes: drama.episodes || [],
            };
        } catch (err) {
            console.error("Error fetching drama details:", err.message);
            return { status: 500, data: null, episodes: [] };
        }
    }

    async searchDrama(query) {
        try {
            const { result } = await this.request("search/text", "POST", {
                search: query, // Note: API expects 'search' not 'query'
            });

            return {
                status: 200,
                data: result.map((item) => ({
                    id: item.id,
                    name: item.name,
                    poster: item.poster,
                    genres: item.genres?.map((g) => g.displayName) || [],
                })),
            };
        } catch (err) {
            console.error("Error searching drama:", err.message);
            return { status: 500, data: [] };
        }
    }

    async getEpisode(dramaId, episodeNumber) {
        try {
            const { episodes } = await this.getDrama(dramaId);
            // Convert to int - URL params are strings but API returns integers
            const epNum = parseInt(episodeNumber, 10);
            const episode = episodes.find((e) => e.episodeNumber === epNum);

            return {
                status: 200,
                data: episode || null,
            };
        } catch (err) {
            console.error("Error fetching episode:", err.message);
            return { status: 500, data: null };
        }
    }
}

export default DramaDash;
