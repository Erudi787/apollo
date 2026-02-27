import { useState, useRef, memo } from 'react'
import { Play, Pause, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import type { SpotifyTrack } from '../types'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { cn } from '../utils/utils'
import { moodAPI } from '../services/api'

interface TrackCardProps {
    track: SpotifyTrack
}

const TrackCard = memo(function TrackCard({ track }: TrackCardProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [audioSrc, setAudioSrc] = useState<string | null>(track.preview_url)
    const [isLoadingAudio, setIsLoadingAudio] = useState(false)
    const [audioProgress, setAudioProgress] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const albumImage = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url
    const artistNames = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'
    const primaryArtistId = track.artists?.[0]?.id || ''
    const spotifyUrl = track.external_urls?.spotify

    const handleFeedback = async (e: React.MouseEvent, type: 'liked' | 'disliked') => {
        e.preventDefault()
        e.stopPropagation()
        if (isSubmitting || !track.id || !primaryArtistId) return

        setIsSubmitting(true)
        const isLiked = type === 'liked'

        try {
            await moodAPI.submitTrackFeedback(track.id, primaryArtistId, isLiked)
            setFeedback(type)
        } catch (error) {
            console.error('[AI.pollo ML] Failed to submit feedback:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const togglePreview = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (isPlaying) {
            audioRef.current?.pause()
            return
        }

        let currentSrc = audioSrc
        if (!currentSrc) {
            setIsLoadingAudio(true)
            try {
                const query = `${track.name} ${track.artists?.[0]?.name || ''}`
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`)
                const data = await res.json()
                if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
                    currentSrc = data.results[0].previewUrl
                    setAudioSrc(currentSrc)
                } else {
                    console.warn("No iTunes preview found.")
                    setIsLoadingAudio(false)
                    return
                }
            } catch (err) {
                console.error("Failed to fetch iTunes preview:", err)
                setIsLoadingAudio(false)
                return
            }
            setIsLoadingAudio(false)
        }

        if (!currentSrc) return

        document.querySelectorAll('audio').forEach((a) => {
            a.pause()
            a.currentTime = 0
        })

        if (!audioRef.current || audioRef.current.src !== currentSrc) {
            audioRef.current = new Audio(currentSrc)
            audioRef.current.volume = 0.5

            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current && audioRef.current.duration) {
                    setAudioProgress(audioRef.current.currentTime / audioRef.current.duration)
                }
            })

            audioRef.current.addEventListener('pause', () => {
                setIsPlaying(false)
            })

            audioRef.current.addEventListener('play', () => {
                setIsPlaying(true)
            })

            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false)
                setAudioProgress(0)
            })
        }
        audioRef.current.play()
    }

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    }

    return (
        <motion.a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            variants={cardVariants}
            whileHover="hover"
            className="group relative block aspect-square rounded-2xl overflow-hidden cursor-pointer"
        >
            {/* Edge-to-edge Album Art */}
            {albumImage ? (
                <img
                    src={albumImage}
                    alt={track.album?.name || track.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                    loading="lazy"
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-4xl opacity-20">🎵</span>
                </div>
            )}

            {/* Dark overlay for text readability (bleeds from bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Floating inner spotlight to give glass-like depth on hover */}
            <motion.div
                variants={{
                    hover: { opacity: 1 }
                }}
                initial={{ opacity: 0 }}
                className="absolute inset-0 border border-white/10 rounded-2xl mix-blend-overlay pointer-events-none transition-opacity duration-500"
            />

            {/* Top-Right ML Feedback Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                    onClick={(e) => handleFeedback(e, 'liked')}
                    disabled={isSubmitting || feedback === 'liked'}
                    className={cn(
                        "p-2 rounded-full true-glass-strong transition-all duration-300 hover:scale-110 shadow-lg pointer-events-auto",
                        feedback === 'liked' ? "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50" : "text-white/70 hover:text-white bg-black/40 hover:bg-black/60"
                    )}
                    aria-label="Like to train AI.pollo"
                >
                    <ThumbsUp size={16} className={cn(feedback === 'liked' && "fill-brand-cyan")} />
                </button>
                <button
                    onClick={(e) => handleFeedback(e, 'disliked')}
                    disabled={isSubmitting || feedback === 'disliked'}
                    className={cn(
                        "p-2 rounded-full true-glass-strong transition-all duration-300 hover:scale-110 shadow-lg pointer-events-auto",
                        feedback === 'disliked' ? "bg-red-500/20 text-red-400 border-red-500/50" : "text-white/70 hover:text-white bg-black/40 hover:bg-black/60"
                    )}
                    aria-label="Dislike to train AI.pollo"
                >
                    <ThumbsDown size={16} className={cn(feedback === 'disliked' && "fill-red-400")} />
                </button>
            </div>

            {/* Content */}
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                {/* Playback Equalizer Overlay */}
                <AnimatePresence>
                    {isPlaying && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex items-end gap-1 mb-4"
                        >
                            {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: ["6px", "24px", "12px", "32px", "8px"] }}
                                    transition={{ repeat: Infinity, duration: 0.8 + i * 0.1, ease: "easeInOut" }}
                                    className="w-1.5 bg-brand-cyan rounded-full"
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <h3 className="font-display font-bold text-lg sm:text-xl text-white leading-tight line-clamp-2 mb-1 drop-shadow-md decoration-white/30 group-hover:underline underline-offset-4">
                    {track.name}
                </h3>
                <p className="text-sm sm:text-base text-white/60 font-medium line-clamp-1 drop-shadow-md">
                    {artistNames}
                </p>
            </div>

            {/* Play/Pause Button Area (always rendered) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                    onClick={togglePreview}
                    disabled={isLoadingAudio}
                    className={cn(
                        "w-16 h-16 rounded-full true-glass-strong flex items-center justify-center transition-all duration-500 hover:scale-110 hover:bg-white/20 pointer-events-auto relative",
                        isPlaying || isLoadingAudio ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
                    )}
                >
                    {/* Progress Ring */}
                    {isPlaying && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
                            <circle
                                cx="32"
                                cy="32"
                                r="30"
                                fill="transparent"
                                stroke="rgba(255, 255, 255, 0.9)"
                                strokeWidth="3"
                                strokeDasharray="188.5"
                                strokeDashoffset={188.5 - (audioProgress || 0) * 188.5}
                                strokeLinecap="round"
                                className="transition-all duration-200 ease-linear"
                            />
                        </svg>
                    )}

                    {isLoadingAudio ? (
                        <Loader2 size={28} className="text-white animate-spin z-10" />
                    ) : isPlaying ? (
                        <Pause size={28} className="text-white fill-white z-10" />
                    ) : (
                        <Play size={28} className="ml-1 text-white fill-white z-10" />
                    )}
                </button>
            </div>
        </motion.a>
    )
})

export default TrackCard
