import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import type { SpotifyTrack } from '../types'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { cn } from '../utils/utils'

interface TrackCardProps {
    track: SpotifyTrack
}

export default function TrackCard({ track }: TrackCardProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const albumImage = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url
    const artistNames = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'
    const spotifyUrl = track.external_urls?.spotify

    const togglePreview = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!track.preview_url) return

        if (isPlaying) {
            audioRef.current?.pause()
            setIsPlaying(false)
        } else {
            document.querySelectorAll('audio').forEach((a) => {
                a.pause()
                a.currentTime = 0
            })

            if (!audioRef.current) {
                audioRef.current = new Audio(track.preview_url)
                audioRef.current.volume = 0.5
                audioRef.current.addEventListener('ended', () => setIsPlaying(false))
            }
            audioRef.current.play()
            setIsPlaying(true)
        }
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

            {/* Play/Pause Button Area (appears on hover or when playing) */}
            {track.preview_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <button
                        onClick={togglePreview}
                        className={cn(
                            "w-16 h-16 rounded-full true-glass-strong flex items-center justify-center transition-all duration-500 hover:scale-110 hover:bg-white/20",
                            isPlaying ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
                        )}
                    >
                        {isPlaying ? (
                            <Pause size={28} className="text-white fill-white" />
                        ) : (
                            <Play size={28} className="ml-1 text-white fill-white" />
                        )}
                    </button>
                </div>
            )}
        </motion.a>
    )
}
