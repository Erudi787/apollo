import { motion, type Variants } from 'framer-motion'

interface PlaylistCardProps {
    playlist: {
        id: string
        name: string
        description?: string
        owner?: { display_name?: string }
        images?: { url: string }[]
        tracks?: { total?: number }
    }
    onClick: () => void
}

export default function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
    const coverImage = playlist.images?.[0]?.url

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
        <motion.div
            variants={cardVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
        >
            {/* Cover Image */}
            {coverImage ? (
                <img
                    src={coverImage}
                    alt={playlist.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                    loading="lazy"
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-5xl opacity-20">🎵</span>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Hover border glow */}
            <motion.div
                variants={{
                    hover: { opacity: 1 }
                }}
                initial={{ opacity: 0 }}
                className="absolute inset-0 border border-white/10 rounded-2xl mix-blend-overlay pointer-events-none"
            />

            {/* Content */}
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                <h3 className="font-display font-bold text-lg sm:text-xl text-white leading-tight line-clamp-2 mb-1 drop-shadow-md">
                    {playlist.name}
                </h3>
                <p className="text-sm text-white/50 line-clamp-1 drop-shadow-md">
                    {playlist.owner?.display_name && `by ${playlist.owner.display_name}`}
                    {playlist.tracks?.total != null && ` · ${playlist.tracks.total} tracks`}
                </p>
            </div>
        </motion.div>
    )
}
