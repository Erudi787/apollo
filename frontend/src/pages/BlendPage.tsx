import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import TrackCard from '../components/TrackCard';
import { useAuth } from '../hooks/useAuth';

interface Participant {
    id: string;
    display_name: string;
    image_url: string;
    is_host: boolean;
}

interface BlendSession {
    id: string;
    host_id: string;
    is_active: boolean;
    participants: Participant[];
}

export default function BlendPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Room State
    const [session, setSession] = useState<BlendSession | null>(null);
    const isHost = session?.host_id === user?.id;

    // Generation State
    const [generating, setGenerating] = useState(false);
    const [generatedTracks, setGeneratedTracks] = useState<any[]>([]);
    const [reserveTracks, setReserveTracks] = useState<any[]>([]);
    const [selectedMood, setSelectedMood] = useState('happy');

    const pollInterval = useRef<any>(null);

    // Statically inject the available moods aligned with Dashboard's MoodSelector IDs
    const moods = ['happy', 'sad', 'energetic', 'chill', 'angry', 'nostalgic', 'anxious', 'cozy', 'melancholic', 'sensual'];

    // Session Polling
    useEffect(() => {
        if (!roomId) {
            setSession(null);
            setGeneratedTracks([]);
            setLoading(false);
            setError('');
            return;
        }

        const fetchSession = async () => {
            try {
                const res = await api.get(`/api/blend/${roomId}`);
                setSession(res.data);

            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError('Session not found or has been closed.');
                    navigate('/blend', { replace: true });
                }
            }
        };

        fetchSession();
        pollInterval.current = setInterval(fetchSession, 3000);

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [roomId, navigate]);

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/blend/create');
            navigate(`/blend/${res.data.session_id}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setLoading(true);
        setError('');
        try {
            await api.post(`/api/blend/${joinCode}/join`);
            navigate(`/blend/${joinCode.toUpperCase()}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to join session');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        try {
            const res = await api.post(`/api/blend/${roomId}/generate`, {
                mood: selectedMood,
                limit: 60
            });
            const tracks = res.data.tracks || [];
            setGeneratedTracks(tracks.slice(0, 20));
            setReserveTracks(tracks.slice(20));
            // Do NOT stop polling, so users can still see people join/leave if we remove the backend lock
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to generate playlist');
        } finally {
            setGenerating(false);
        }
    };

    const handleReplaceTrack = useCallback((trackId: string) => {
        if (reserveTracks.length > 0) {
            const trackToInject = reserveTracks[0];
            setReserveTracks(prev => prev.slice(1));
            setGeneratedTracks(prev => prev.map(t => t.id === trackId ? trackToInject : t));
        } else {
            setGeneratedTracks(prev => prev.filter(t => t.id !== trackId));
        }
    }, [reserveTracks]);

    const handleLeave = async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            await api.post(`/api/blend/${roomId}/leave`);
            if (pollInterval.current) clearInterval(pollInterval.current);
            navigate('/blend', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to leave session');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-8 relative">

                {/* Error Toast */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-50 font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!roomId ? (
                    // ==========================================
                    // LOBBY VIEW
                    // ==========================================
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-10 rounded-3xl max-w-md w-full text-center space-y-8"
                        >
                            <div>
                                <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">Spotify Blend</h1>
                                <p className="text-slate-400">Collaboratively generate an AI playlist optimized for your entire group's taste.</p>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create New Session'}
                            </button>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-700/50"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium">OR JOIN WITH CODE</span>
                                <div className="flex-grow border-t border-slate-700/50"></div>
                            </div>

                            <form onSubmit={handleJoin} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter 5-Letter Code"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={5}
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] font-mono py-4 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors uppercase placeholder:tracking-normal placeholder:text-base"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || joinCode.length !== 5}
                                    className="w-full bg-slate-700 text-white font-bold py-4 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    Join Room
                                </button>
                            </form>
                        </motion.div>
                    </div>
                ) : (
                    // ==========================================
                    // WAITING ROOM / RESULTS VIEW
                    // ==========================================
                    <div className="space-y-8">
                        {/* Header Banner */}
                        <div className="glass-card p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-sm font-bold text-cyan-400 tracking-wider uppercase mb-1">Room Code</h2>
                                <div className="text-5xl font-mono font-black text-white tracking-[0.2em]">{roomId}</div>
                            </div>

                            <div className="flex-1 max-w-sm w-full">
                                {isHost ? (
                                    <div className="space-y-3">
                                        <select
                                            value={selectedMood}
                                            onChange={e => setSelectedMood(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 text-white py-3 px-4 rounded-xl focus:outline-none focus:border-cyan-500"
                                        >
                                            {moods.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.split('_')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ')} Vibe
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating}
                                            className="w-full bg-cyan-500 text-slate-900 font-black py-3 rounded-xl hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-lg flex justify-center items-center"
                                        >
                                            {generating ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                                    Computing Consensus...
                                                </span>
                                            ) : (generatedTracks.length > 0 ? 'Regenerate Blend' : 'Generate Group Blend')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                                        {generating ? (
                                            <>
                                                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                <p className="text-slate-300 font-medium tracking-wide">AI.pollo is analyzing tastes...</p>
                                            </>
                                        ) : (
                                            <>
                                                {generatedTracks.length > 0 ? (
                                                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Blend Complete!</p>
                                                ) : (
                                                    <p className="text-slate-400 font-medium">Waiting for Host to Generate...</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={handleLeave}
                                        disabled={loading}
                                        className="text-red-400 hover:text-red-300 text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-red-400/10 transition-colors"
                                    >
                                        Leave Session
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Combined Results and Participants View */}
                        <div className="space-y-12">
                            {/* Participants Grid Always Visible */}
                            <div className="glass-card p-8 rounded-3xl">
                                <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                                    <span>Joined Participants</span>
                                    <span className="bg-slate-700/50 border border-slate-600 font-sans text-xs py-1 px-3 rounded-full text-slate-300">
                                        {session?.participants.length || 0} Ready
                                    </span>
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <AnimatePresence>
                                        {session?.participants.map(p => (
                                            <motion.div
                                                key={p.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center gap-3 relative overflow-hidden"
                                            >
                                                {p.is_host && (
                                                    <div className="absolute top-0 w-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold py-1 uppercase tracking-widest">
                                                        Host
                                                    </div>
                                                )}
                                                <div className="w-16 h-16 rounded-full overflow-hidden mt-3 border-2 border-slate-700 bg-slate-800">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.display_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl text-slate-500">
                                                            {p.display_name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-sm text-slate-200 truncate w-full">
                                                    {p.display_name}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Results Grid Visible ONLY When Tracks Exist */}
                            {generatedTracks.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h2 className="text-3xl font-display font-bold text-white mb-2">Group Blend Output</h2>
                                            <p className="text-slate-400">AI-optimized based on overlapping tastes of <span className="text-cyan-400">{session?.participants.length}</span> friends.</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="text-cyan-400 hover:text-cyan-300 font-bold px-4 py-2 border border-cyan-400/30 rounded-lg hover:bg-cyan-900/20 transition-colors"
                                        >
                                            Go to Dashboard
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {generatedTracks.map((track: any, idx: number) => (
                                            <div key={`${track.id}-${idx}`} className="transform scale-95 origin-top">
                                                <TrackCard track={track} onReplace={handleReplaceTrack} />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
