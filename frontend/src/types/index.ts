export interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}

export interface SpotifyUser {
    id: string;
    display_name: string | null;
    email: string;
    images: SpotifyImage[];
    external_urls: { spotify: string };
}

export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    images: SpotifyImage[];
    external_urls: { spotify: string };
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    images: SpotifyImage[];
    release_date: string;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    uri: string;
    preview_url: string | null;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    external_urls: { spotify: string };
    duration_ms: number;
}

export interface MoodProfile {
    description: string;
    genres: string[];
    valence: number;
    energy: number;
}

export interface MoodAnalysisResponse {
    detected_mood: string | null;
    confidence: number;
    description: string | null;
    scores: Record<string, number>;
    text_analyzed: string;
}

export interface RecommendationResponse {
    mood: string;
    description: string;
    tracks: SpotifyTrack[];
    detected_from_text?: boolean;
}

export interface MoodRecommendationRequest {
    text?: string;
    mood?: string;
    limit?: number;
}

export interface PlaylistCreateResponse {
    id: string;
    name: string;
    external_urls: { spotify: string };
    tracks_added: number;
}

export interface AuthUser {
    id: string;
    display_name: string | null;
    email: string;
    images: Array<{ url: string }>;
}

export interface AuthStatusResponse {
    authenticated: boolean;
    user?: AuthUser;
}

export type MoodId =
    | 'happy'
    | 'sad'
    | 'energetic'
    | 'chill'
    | 'angry'
    | 'nostalgic'
    | 'anxious'
    | 'cozy'
    | 'melancholic';

export interface MoodOption {
    id: MoodId;
    emoji: string;
    label: string;
    color: string;
}

export interface Message {
    type: 'success' | 'error';
    text: string;
    link?: string;
}