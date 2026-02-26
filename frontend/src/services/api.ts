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

const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888');

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

// Request interceptor to attach localStorage token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for automatic token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Prevent infinite retry loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refresh_token: refreshToken
                }, { withCredentials: true });

                const newAccessToken = response.data.access_token;
                if (!newAccessToken) throw new Error('No access token returned');

                // Save new token and retry failed request
                localStorage.setItem('access_token', newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api.request(originalRequest);
            } catch (err) {
                // Refresh failed entirely, clear storage and kick to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(err);
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
    submitTrackFeedback: (trackId: string, artistId: string, isLiked: boolean) =>
        api.post<{ message: string; is_liked: boolean }>('/api/recommendations/feedback', {
            track_id: trackId,
            artist_id: artistId,
            is_liked: isLiked
        }),
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