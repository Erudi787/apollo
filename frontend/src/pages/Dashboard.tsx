import { useState } from 'react'
import Navbar from '../components/Navbar'
import MoodSelector from '../components/MoodSelector'
import PlaylistGrid from '../components/PlaylistGrid'
import { moodAPI } from '../services/api'
import type { SpotifyTrack } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../utils/utils'

// Map moods specifically to the custom CSS variable colors we defined for the mesh
const MOOD_AURA_MAP: Record<string, string> = {
    happy: 'bg-[var(--color-aura-happy)]',
    sad: 'bg-[var(--color-aura-sad)]',
    energetic: 'bg-[var(--color-aura-energetic)]',
    chill: 'bg-[var(--color-aura-chill)]',
    angry: 'bg-[var(--color-aura-angry)]',
    nostalgic: 'bg-[var(--color-aura-nostalgic)]',
    anxious: 'bg-[var(--color-aura-anxious)]',
    cozy: 'bg-[var(--color-aura-cozy)]',
    melancholic: 'bg-[var(--color-aura-melancholic)]',
    default: 'bg-[var(--color-aura-default)]'
}

export default function Dashboard() {
    const [selectedMood, setSelectedMood] = useState<string | null>(null)
    const [moodDescription, setMoodDescription] = useState<string>('')
    const [tracks, setTracks] = useState<SpotifyTrack[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleMoodSelect = async (mood: string) => {
        setSelectedMood(mood)
        setError(null)
        setLoading(true)

        try {
            const { data } = await moodAPI.getRecommendations(mood, 24) // 24 looks better in borderless grid
            setMoodDescription(data.description)
            setTracks(data.tracks)
        } catch (err) {
            console.error('Failed to get recommendations:', err)
            setError('Failed to load recommendations. Please try again.')
            setTracks([])
        } finally {
            setLoading(false)
        }
    }

    const handleTextMood = async (text: string) => {
        setError(null)
        setLoading(true)

        try {
            const { data } = await moodAPI.getMoodRecommendations({ text, limit: 24 })
            setSelectedMood(data.mood)
            setMoodDescription(data.description)
            setTracks(data.tracks)
        } catch (err) {
            console.error('Failed to analyze mood:', err)
            setError('Could not analyze your mood. Try selecting one manually.')
            setTracks([])
        } finally {
            setLoading(false)
        }
    }

    const activeAuraColor = selectedMood ? MOOD_AURA_MAP[selectedMood] || MOOD_AURA_MAP.default : 'bg-white'

    return (
        <div className="min-h-screen relative bg-black text-white font-sans selection:bg-white/20">

            {/* Liquid Aura Background that responds to the selected mood */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: selectedMood ? [0.15, 0.25, 0.15] : [0.05, 0.1, 0.05],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] sm:w-[100vw] sm:h-[100vw] rounded-full blur-[150px] mix-blend-screen transition-colors duration-1000",
                        activeAuraColor
                    )}
                />
                <div className="noise-overlay" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-16">

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 xl:gap-20">
                        {/* Sidebar: Mood Selection */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="xl:col-span-4 flex flex-col pt-4"
                        >
                            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-8">
                                How are you <br /> <span className="text-white/40">feeling?</span>
                            </h1>
                            <MoodSelector
                                selectedMood={selectedMood}
                                onMoodSelect={handleMoodSelect}
                                onTextSubmit={handleTextMood}
                            />
                        </motion.div>

                        {/* Main Content Area */}
                        <div className="xl:col-span-8 min-h-[500px]">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-8"
                                    >
                                        <div className="p-4 true-glass border-l-2 border-red-500 text-white/80">
                                            {error}
                                        </div>
                                    </motion.div>
                                )}

                                {(selectedMood || loading) ? (
                                    <motion.div
                                        key="results"
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -30 }}
                                        transition={{ duration: 0.5, staggerChildren: 0.1 }}
                                    >
                                        {/* Header describing the mood */}
                                        <AnimatePresence mode="wait">
                                            {selectedMood && !loading && (
                                                <motion.div
                                                    key={selectedMood}
                                                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                                                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                                                    className="mb-10"
                                                >
                                                    <h2 className="font-display text-3xl font-bold capitalize mb-2">
                                                        {selectedMood} Collection
                                                    </h2>
                                                    <p className="text-white/50 text-lg max-w-2xl font-light">
                                                        {moodDescription}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <PlaylistGrid tracks={tracks} loading={loading} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full flex flex-col items-center justify-center text-center py-32"
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-32 h-32 mb-8 rounded-full true-glass-strong flex items-center justify-center border border-white/10"
                                        >
                                            <span className="text-5xl opacity-80">🪐</span>
                                        </motion.div>
                                        <h2 className="font-display text-3xl font-bold mb-4">Awaiting Signal</h2>
                                        <p className="text-white/40 max-w-sm text-lg font-light leading-relaxed">
                                            Select a mood or describe your feelings to tune AI.pollo to your wavelength.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
