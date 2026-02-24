import axios, { AxiosError } from 'axios';
import type {
    SpotifyUser,
    SpotifyTrack,
    SpotifyArtist,
    MoodProfile,
    MoodAnalysisResponse,
    RecommendationResponse,
    MoodRecommendationRequest,
    PlaylistCreateResponse,
    AuthStatusResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888';

// ============================================================
// API Client Setup
// ============================================================

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for automatic token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            try {
                await api.post('/auth/refresh');
                return api.request(error.config!);
            } catch {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================================
// API Modules
// ============================================================

export const authAPI = {
    getStatus: () => api.get<AuthStatusResponse>('/auth/status'),
    logout: () => api.post('/auth/logout'),
    getLoginUrl: () => `${API_BASE_URL}/auth/login`,
};

export const userAPI = {
    getProfile: () => api.get<SpotifyUser>('/api/user/profile'),
    getTopTracks: (timeRange: string = 'medium_term', limit: number = 20) =>
        api.get<{ items: SpotifyTrack[] }>('/api/user/top-tracks', {
            params: { time_range: timeRange, limit },
        }),
    getTopArtists: (timeRange: string = 'medium_term', limit: number = 20) =>
        api.get<{ items: SpotifyArtist[] }>('/api/user/top-artists', {
            params: { time_range: timeRange, limit },
        }),
};

export const moodAPI = {
    analyzeMood: (text: string) =>
        api.post<MoodAnalysisResponse>('/api/analyze-mood', { text }),
    getMoods: () => api.get<Record<string, MoodProfile>>('/api/moods'),
    getRecommendations: (mood: string, limit: number = 20) =>
        api.get<RecommendationResponse>('/api/recommendations', {
            params: { mood, limit },
        }),
    getMoodRecommendations: (data: MoodRecommendationRequest) =>
        api.post<RecommendationResponse>('/api/mood-recommendations', data),
    searchPlaylists: (mood: string, limit: number = 10) =>
        api.get('/api/playlists/search', { params: { mood, limit } }),
    getPlaylistTracks: (playlistId: string) =>
        api.get<{ tracks: SpotifyTrack[]; total: number }>(`/api/playlists/${playlistId}/tracks`),
};

export const playlistAPI = {
    create: (
        name: string,
        trackUris: string[],
        description: string = '',
        isPublic: boolean = true
    ) =>
        api.post<PlaylistCreateResponse>('/api/playlists/create', {
            name,
            track_uris: trackUris,
            description,
            public: isPublic,
        }),
};

export default api;