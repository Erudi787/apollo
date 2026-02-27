import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import MoodSelector from '../components/MoodSelector'
import PlaylistGrid from '../components/PlaylistGrid'
import PlaylistCard from '../components/PlaylistCard'
import PlaylistModal from '../components/PlaylistModal'
import { moodAPI, playlistAPI } from '../services/api'
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

type ViewTab = 'recommendations' | 'discover'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpotifyPlaylist = any

export default function Dashboard() {
    const [selectedMood, setSelectedMood] = useState<string | null>(null)
    const [moodDescription, setMoodDescription] = useState<string>('')
    const [displayTracks, setDisplayTracks] = useState<SpotifyTrack[]>([])
    const [reserveTracks, setReserveTracks] = useState<SpotifyTrack[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Tab state
    const [activeTab, setActiveTab] = useState<ViewTab>('recommendations')

    // Discover state
    const [discoveredPlaylists, setDiscoveredPlaylists] = useState<SpotifyPlaylist[]>([])
    const [discoverLoading, setDiscoverLoading] = useState(false)
    const [discoverMood, setDiscoverMood] = useState<string | null>(null)

    // Modal state
    const [modalPlaylist, setModalPlaylist] = useState<SpotifyPlaylist | null>(null)
    const [modalTracks, setModalTracks] = useState<SpotifyTrack[]>([])
    const [modalLoading, setModalLoading] = useState(false)

    // Save state
    const [saving, setSaving] = useState(false)
    const [savedLink, setSavedLink] = useState<string | null>(null)
    const [playlistName, setPlaylistName] = useState<string>('')

    const handleMoodSelect = async (mood: string) => {
        setSelectedMood(mood)
        setError(null)
        setLoading(true)
        setActiveTab('recommendations')
        setSavedLink(null)
        setDiscoveredPlaylists([])
        setPlaylistName(`AI.pollo · ${mood.charAt(0).toUpperCase() + mood.slice(1)} Vibes`)

        try {
            const { data } = await moodAPI.getRecommendations(mood, 60)
            setMoodDescription(data.description)
            setDisplayTracks(data.tracks.slice(0, 50))
            setReserveTracks(data.tracks.slice(50))
        } catch (err) {
            console.error('Failed to get recommendations:', err)
            setError('Failed to load recommendations. Please try again.')
            setDisplayTracks([])
            setReserveTracks([])
        } finally {
            setLoading(false)
        }
    }

    const handleTextMood = async (text: string) => {
        setError(null)
        setLoading(true)
        setActiveTab('recommendations')
        setSavedLink(null)
        setDiscoveredPlaylists([])

        try {
            const { data } = await moodAPI.getMoodRecommendations({ text, limit: 60 })
            setSelectedMood(data.mood)
            setMoodDescription(data.description)
            setDisplayTracks(data.tracks.slice(0, 50))
            setReserveTracks(data.tracks.slice(50))
            setPlaylistName(`AI.pollo · ${data.mood.charAt(0).toUpperCase() + data.mood.slice(1)} Vibes`)
        } catch (err) {
            console.error('Failed to analyze mood:', err)
            setError('Could not analyze your mood. Try selecting one manually.')
            setDisplayTracks([])
            setReserveTracks([])
        } finally {
            setLoading(false)
        }
    }

    const handleSavePlaylist = async () => {
        if (!selectedMood || displayTracks.length === 0 || saving) return

        setSaving(true)
        try {
            const trackUris = displayTracks
                .map(t => t.uri)
                .filter(Boolean)

            const finalName = playlistName.trim() || `AI.pollo · ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes`
            const description = `Curated by AI.pollo based on your ${selectedMood} mood. ${moodDescription}`

            const { data } = await playlistAPI.create(finalName, trackUris, description, true)
            // Use native deep-link URI "spotify:playlist:{id}" to force-open the app, fallback to web URL
            setSavedLink(data.id ? `spotify:playlist:${data.id}` : data.external_urls?.spotify || null)
        } catch (err) {
            console.error('Failed to save playlist:', err)
            setError('Failed to save playlist. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleReplaceTrack = (trackId: string) => {
        setDisplayTracks(currentDisplay => {
            const trackIndex = currentDisplay.findIndex(t => t.id === trackId)
            if (trackIndex === -1) return currentDisplay

            const newDisplay = [...currentDisplay]

            setReserveTracks(currentReserve => {
                if (currentReserve.length > 0) {
                    const nextReserve = [...currentReserve]
                    const replacementTrack = nextReserve.shift()!
                    newDisplay[trackIndex] = replacementTrack
                    return nextReserve
                } else {
                    newDisplay.splice(trackIndex, 1)
                    return currentReserve
                }
            })

            return newDisplay
        })
    }

    const handleDiscoverTab = async () => {
        setActiveTab('discover')
        // Only refetch if mood changed or no data yet
        if (!selectedMood || (discoveredPlaylists.length > 0 && discoverMood === selectedMood)) return

        setDiscoverLoading(true)
        setDiscoveredPlaylists([])
        try {
            const { data } = await moodAPI.searchPlaylists(selectedMood, 12)
            // Spotify can return null items in the array — filter them out
            const validPlaylists = (data.playlists || []).filter((p: SpotifyPlaylist) => p && p.id)
            setDiscoveredPlaylists(validPlaylists)
            setDiscoverMood(selectedMood)
        } catch (err) {
            console.error('Failed to discover playlists:', err)
            setError('Failed to find playlists. Please try again.')
        } finally {
            setDiscoverLoading(false)
        }
    }

    const handleRefresh = async () => {
        if (!selectedMood) return
        if (activeTab === 'recommendations') {
            handleMoodSelect(selectedMood)
        } else {
            setDiscoverLoading(true)
            setDiscoveredPlaylists([])
            try {
                const { data } = await moodAPI.searchPlaylists(selectedMood, 12)
                const validPlaylists = (data.playlists || []).filter((p: SpotifyPlaylist) => p && p.id)
                setDiscoveredPlaylists(validPlaylists)
            } catch (err) {
                console.error('Failed to discover playlists:', err)
                setError('Failed to refresh playlists. Please try again.')
            } finally {
                setDiscoverLoading(false)
            }
        }
    }

    const handlePlaylistClick = async (playlist: SpotifyPlaylist) => {
        setModalPlaylist(playlist)
        setModalTracks([])
        setModalLoading(true)

        try {
            const { data } = await moodAPI.getPlaylistTracks(playlist.id)
            setModalTracks(data.tracks || [])
        } catch (err) {
            console.error('Failed to fetch playlist tracks:', err)
        } finally {
            setModalLoading(false)
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
                                        transition={{ duration: 0.5 }}
                                    >
                                        {/* Header with mood title + action buttons */}
                                        <AnimatePresence mode="wait">
                                            {selectedMood && !loading && (
                                                <motion.div
                                                    key={selectedMood}
                                                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                                                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                                                    className="mb-8"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                                        <div>
                                                            <h2 className="font-display text-3xl font-bold capitalize mb-1">
                                                                {selectedMood} Collection
                                                            </h2>
                                                            <p className="text-white/50 text-lg max-w-2xl font-light">
                                                                {moodDescription}
                                                            </p>
                                                        </div>

                                                        {/* Save playlist button */}
                                                        {displayTracks.length > 0 && activeTab === 'recommendations' && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: 0.3 }}
                                                            >
                                                                {savedLink ? (
                                                                    <a
                                                                        href={savedLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full magnetic-btn font-display font-bold text-sm tracking-wide text-white transition-transform hover:scale-105 active:scale-95"
                                                                    >
                                                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                                                        </svg>
                                                                        Open in Spotify ✓
                                                                    </a>
                                                                ) : (
                                                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                                                        <input
                                                                            type="text"
                                                                            value={playlistName}
                                                                            onChange={(e) => setPlaylistName(e.target.value)}
                                                                            placeholder="Name your playlist..."
                                                                            className="w-full sm:w-64 px-4 py-3 rounded-full true-glass bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-display text-sm tracking-wide"
                                                                        />
                                                                        <button
                                                                            onClick={handleSavePlaylist}
                                                                            disabled={saving || !playlistName.trim()}
                                                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full true-glass hover:bg-white/10 transition-all font-display font-bold text-sm tracking-wide text-white/80 hover:text-white disabled:opacity-50 hover:scale-105 active:scale-95 whitespace-nowrap"
                                                                        >
                                                                            {saving ? (
                                                                                <>
                                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    Saving...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                                                                    </svg>
                                                                                    Save to Spotify
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </div>

                                                    {/* Controls Row: Tab Switcher + Refresh */}
                                                    <div className="flex items-center gap-3">
                                                        {/* Tab switcher */}
                                                        <div className="flex gap-1 true-glass rounded-2xl p-1.5 w-fit">
                                                            <button
                                                                onClick={() => setActiveTab('recommendations')}
                                                                className={cn(
                                                                    "px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all",
                                                                    activeTab === 'recommendations'
                                                                        ? "bg-white/10 text-white shadow-lg"
                                                                        : "text-white/40 hover:text-white/70"
                                                                )}
                                                            >
                                                                For You
                                                            </button>
                                                            <button
                                                                onClick={handleDiscoverTab}
                                                                className={cn(
                                                                    "px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all",
                                                                    activeTab === 'discover'
                                                                        ? "bg-white/10 text-white shadow-lg"
                                                                        : "text-white/40 hover:text-white/70"
                                                                )}
                                                            >
                                                                Discover
                                                            </button>
                                                        </div>

                                                        {/* Refresh Button */}
                                                        <button
                                                            onClick={handleRefresh}
                                                            disabled={loading || discoverLoading}
                                                            className="p-3 rounded-2xl true-glass hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-50"
                                                            aria-label="Refresh Recommendations"
                                                        >
                                                            <RefreshCw className={cn("w-5 h-5", (loading || discoverLoading) && "animate-spin")} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Content based on active tab */}
                                        <AnimatePresence mode="wait">
                                            {activeTab === 'recommendations' ? (
                                                <motion.div
                                                    key="recs"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <PlaylistGrid tracks={displayTracks} loading={loading} onReplaceTrack={handleReplaceTrack} />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="discover"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    {discoverLoading ? (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                                                            {Array.from({ length: 8 }).map((_, i) => (
                                                                <div key={i} className="aspect-square rounded-2xl bg-white/[0.03] animate-pulse" />
                                                            ))}
                                                        </div>
                                                    ) : discoveredPlaylists.length > 0 ? (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ staggerChildren: 0.05 }}
                                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6"
                                                        >
                                                            {discoveredPlaylists.map((pl: SpotifyPlaylist) => (
                                                                <PlaylistCard
                                                                    key={pl.id}
                                                                    playlist={pl}
                                                                    onClick={() => handlePlaylistClick(pl)}
                                                                />
                                                            ))}
                                                        </motion.div>
                                                    ) : (
                                                        <div className="flex items-center justify-center py-32">
                                                            <p className="text-white/30 text-xl font-display font-medium">No playlists found for this mood.</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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

            {/* Playlist Modal */}
            <AnimatePresence>
                {modalPlaylist && (
                    <PlaylistModal
                        playlist={modalPlaylist}
                        tracks={modalTracks}
                        loading={modalLoading}
                        onClose={() => setModalPlaylist(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
