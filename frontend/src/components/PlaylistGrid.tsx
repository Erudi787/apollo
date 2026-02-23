import TrackCard from './TrackCard'
import type { SpotifyTrack } from '../types'
import { motion } from 'framer-motion'

interface PlaylistGridProps {
    tracks: SpotifyTrack[]
    loading: boolean
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="glass-card overflow-hidden animate-pulse rounded-2xl">
                    <div className="aspect-square bg-slate-200/50 dark:bg-slate-800/50" />
                    <div className="p-4 space-y-3">
                        <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function PlaylistGrid({ tracks, loading }: PlaylistGridProps) {
    if (loading) {
        return <LoadingSkeleton />
    }

    if (tracks.length === 0) {
        return null
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05, // Rapid cascade
            }
        }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
        >
            {tracks.map((track, index) => (
                <TrackCard key={track.id || index} track={track} />
            ))}
        </motion.div>
    )
}
