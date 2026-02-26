import type { SpotifyTrack } from '../types'
import { motion, type Variants } from 'framer-motion'
import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '../utils/utils'

interface PlaylistModalProps {
    playlist: {
        id: string
        name: string
        description?: string
        owner?: { display_name?: string }
        images?: { url: string }[]
        external_urls?: { spotify?: string }
        tracks?: { total?: number }
    }
    tracks: SpotifyTrack[]
    loading: boolean
    onClose: () => void
}

export default function PlaylistModal({ playlist, tracks, loading, onClose }: PlaylistModalProps) {
    const [playingId, setPlayingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const coverImage = playlist.images?.[0]?.url
    const spotifyUrl = playlist.id ? `spotify:playlist:${playlist.id}` : playlist.external_urls?.spotify

    const togglePreview = (track: SpotifyTrack) => {
        if (!track.preview_url) return

        if (playingId === track.id) {
            audioRef.current?.pause()
            setPlayingId(null)
            return
        }

        // Stop any playing audio
        audioRef.current?.pause()
        const audio = new Audio(track.preview_url)
        audio.volume = 0.5
        audio.addEventListener('ended', () => setPlayingId(null))
        audio.play()
        audioRef.current = audio
        setPlayingId(track.id)
    }

    const handleClose = () => {
        audioRef.current?.pause()
        onClose()
    }

    const formatDuration = (ms: number) => {
        const min = Math.floor(ms / 60000)
        const sec = Math.floor((ms % 60000) / 1000)
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    const backdropVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    }

    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 60, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 28 }
        },
    }

    return (
        <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl true-glass-strong border border-white/5 overflow-hidden flex flex-col"
            >
                {/* Header with cover art */}
                <div className="relative flex-shrink-0">
                    {coverImage && (
                        <div className="absolute inset-0 h-48">
                            <img src={coverImage} alt="" className="w-full h-full object-cover opacity-30 blur-md" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90" />
                        </div>
                    )}
                    <div className="relative p-6 pb-4 flex gap-5 items-end min-h-[140px]">
                        {coverImage && (
                            <img
                                src={coverImage}
                                alt={playlist.name}
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Playlist</p>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2 mb-1">
                                {playlist.name}
                            </h2>
                            {playlist.owner?.display_name && (
                                <p className="text-white/50 text-sm font-medium">by {playlist.owner.display_name}</p>
                            )}
                            {playlist.tracks?.total != null && (
                                <p className="text-white/30 text-xs mt-1">{playlist.tracks.total} tracks</p>
                            )}
                        </div>
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full true-glass flex items-center justify-center text-white/60 hover:text-white transition-colors hover:bg-white/10"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tracklist */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                    {loading ? (
                        <div className="space-y-3 py-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-white/5 rounded w-3/4" />
                                        <div className="h-2.5 bg-white/5 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {tracks.map((track, i) => (
                                <motion.li
                                    key={track.id || i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center gap-3 py-3 group hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition-colors"
                                >
                                    {/* Track number or play button */}
                                    <button
                                        onClick={() => togglePreview(track)}
                                        disabled={!track.preview_url}
                                        className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium transition-all",
                                            track.preview_url
                                                ? "true-glass hover:bg-white/10 cursor-pointer"
                                                : "bg-white/[0.02] text-white/20 cursor-default"
                                        )}
                                    >
                                        {playingId === track.id ? (
                                            <Pause size={16} className="text-brand-cyan fill-brand-cyan" />
                                        ) : track.preview_url ? (
                                            <Play size={16} className="ml-0.5 text-white/60 group-hover:text-white transition-colors" />
                                        ) : (
                                            <span className="text-white/20">{i + 1}</span>
                                        )}
                                    </button>

                                    {/* Album art mini */}
                                    {track.album?.images?.[track.album.images.length - 1]?.url && (
                                        <img
                                            src={track.album.images[track.album.images.length - 1].url}
                                            alt=""
                                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                        />
                                    )}

                                    {/* Track info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/90 text-sm font-semibold truncate">{track.name}</p>
                                        <p className="text-white/40 text-xs truncate">
                                            {track.artists?.map(a => a.name).join(', ')}
                                        </p>
                                    </div>

                                    {/* Duration */}
                                    <span className="text-white/20 text-xs font-mono flex-shrink-0">
                                        {track.duration_ms ? formatDuration(track.duration_ms) : ''}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer with action buttons */}
                <div className="flex-shrink-0 p-4 border-t border-white/5 flex gap-3">
                    {spotifyUrl && (
                        <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl magnetic-btn font-display font-bold text-base tracking-wide text-white transition-transform hover:scale-[1.02] active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Open in Spotify
                        </a>
                    )}
                    <button
                        onClick={handleClose}
                        className="px-6 py-3.5 rounded-2xl true-glass hover:bg-white/10 transition-colors text-white/60 hover:text-white font-medium"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
