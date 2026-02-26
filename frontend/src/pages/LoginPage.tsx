import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useInAppBrowser } from '../hooks/useInAppBrowser'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowUp, LogOut, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { user, login, logout } = useAuth()
    const navigate = useNavigate()
    const isInAppBrowser = useInAppBrowser()

    const [scrolled, setScrolled] = useState(false)
    const buttonRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
                    setScrolled(true)
                } else {
                    setScrolled(false)
                }
            },
            { threshold: 0 }
        )

        if (buttonRef.current) {
            observer.observe(buttonRef.current)
        }

        return () => observer.disconnect()
    }, [])

    const COLORS = [
        'var(--color-brand-cyan)',
        'var(--color-brand-purple)',
        'var(--color-aura-happy)',
        'var(--color-aura-sad)',
        'var(--color-aura-energetic)',
        'var(--color-aura-chill)',
        'var(--color-aura-nostalgic)',
        'var(--color-aura-melancholic)',
        'var(--color-aura-sensual)',
    ];

    const ARTISTS = [
        "Chase Atlantic", "SZA", "sombr", "Luke Chiang", "Emotional Oranges", "Galdive",
        "The Weeknd", "Arctic Monkeys", "Lana Del Rey", "Frank Ocean", "Tame Impala",
        "Joji", "Billie Eilish", "Mac DeMarco", "Cigarettes After Sex", "Rex Orange County",
        "Daniel Caesar", "Brent Faiyaz", "PinkPantheress", "Steve Lacy", "Tyler, The Creator",
        "Kali Uchis", "Hozier", "Mac Miller", "Clairo", "beabadoobee", "Dominic Fike",
        "J. Cole", "Kendrick Lamar", "Drake", "Post Malone", "Doja Cat", "Olivia Rodrigo"
    ];

    const shuffledArtists = useMemo(() => {
        return [...ARTISTS]
            .sort(() => Math.random() - 0.5)
            .map(name => {
                const color = COLORS[Math.floor(Math.random() * COLORS.length)]
                return { name, color }
            })
    }, [])

    // Liquid Aura constraints and variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            }
        }
    }

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { type: "spring", stiffness: 200, damping: 20 }
        }
    }

    const featureVariants: Variants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100, damping: 20 }
        }
    }

    return (
        <div className="min-h-screen relative w-full overflow-x-hidden bg-black text-white font-sans selection:bg-brand-purple selection:text-white">

            {/* Sticky Header for Landing Page */}
            <AnimatePresence>
                {scrolled && (
                    <motion.nav
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="fixed top-0 left-0 right-0 z-50 true-glass border-b border-white/5 px-6 py-4 flex justify-between items-center"
                    >
                        <div className="font-display font-bold text-xl tracking-tight text-white flex items-center">
                            <span className="text-brand-cyan">AI.</span>pollo
                        </div>
                        {user ? (
                            <div className="flex items-center gap-3">
                                {/* Profile Info */}
                                <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-full pl-2 pr-4 py-1.5 border border-white/10">
                                    {user.images?.[0]?.url ? (
                                        <img
                                            src={user.images[0].url}
                                            alt={user.display_name || 'User'}
                                            className="w-7 h-7 rounded-full ring-2 ring-brand-cyan/50"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-brand-purple/80 flex items-center justify-center text-white text-xs font-bold">
                                            {(user.display_name || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-white/90 truncate max-w-[120px]">
                                        {user.display_name || 'Spotify User'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="px-6 py-2 rounded-full magnetic-btn font-display font-bold text-sm tracking-wide text-white transition-transform hover:scale-105 active:scale-95 bg-white/10 hover:bg-white/20"
                                >
                                    Explore Songs →
                                </button>
                                <button
                                    onClick={logout}
                                    className="p-2 ml-1 rounded-full text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    aria-label="Log out"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={login}
                                className="px-6 py-2 flex items-center gap-2 rounded-full magnetic-btn font-display font-bold text-sm tracking-wide text-white transition-transform hover:scale-105 active:scale-95"
                            >
                                <svg className="w-4 h-4 text-spotify" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                Connect
                            </button>
                        )}
                    </motion.nav>
                )}
            </AnimatePresence>

            {/* Scroll-to-Top FAB (appears with sticky header) */}
            <AnimatePresence>
                {scrolled && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 z-50 p-4 rounded-full true-glass border border-white text-white/80 hover:text-white shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Animated Liquid Aura Mesh Background (Fixed pos so it stays during scroll) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-brand-cyan/20 rounded-full blur-[120px] mix-blend-screen animate-mesh-1" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-brand-purple/20 rounded-full blur-[140px] mix-blend-screen animate-mesh-2" />
                <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] bg-indigo-500/15 rounded-full blur-[100px] mix-blend-screen animate-mesh-3" />
            </div>

            {/* Grain/Noise overlay for organic premium feel */}
            <div className="noise-overlay" />

            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center w-full max-w-4xl text-center"
                >
                    {/* Logomark / Icon */}
                    <motion.div variants={itemVariants} className="mb-8">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full true-glass-strong flex items-center justify-center relative shadow-2xl shadow-brand-cyan/10">
                            {/* Inner glow on the glass artifact */}
                            <div className="absolute inset-0 rounded-full border border-white/20" />
                            <span className="text-4xl sm:text-5xl drop-shadow-lg opacity-90">𓏢</span>
                        </div>
                    </motion.div>

                    {/* Massive Typography Headers */}
                    <motion.div variants={itemVariants} className="mb-4 relative">
                        {/* Floating Glass Tags */}
                        <motion.div
                            animate={{ y: [0, -15, 0], rotate: [0, -5, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-10 -left-12 sm:-left-24 px-4 py-2 true-glass rounded-full text-brand-purple/80 text-sm font-medium border border-white/5 shadow-2xl z-0 pointer-events-none"
                        >
                            ✧ Late Night Drive
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 20, 0], rotate: [0, 5, 0] }}
                            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-8 -right-8 sm:-right-20 px-4 py-2 true-glass rounded-full text-brand-cyan/80 text-sm font-medium border border-white/5 shadow-2xl z-0 pointer-events-none"
                        >
                            Indie Pop ♫
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute -top-20 right-0 sm:right-10 px-4 py-2 true-glass rounded-full text-indigo-400/80 text-sm font-medium border border-white/5 shadow-2xl z-0 pointer-events-none hidden sm:block"
                        >
                            Main Character
                        </motion.div>

                        <h1 className="font-display text-[5rem] sm:text-[8rem] md:text-[10rem] font-black leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 pb-4 pr-4 sm:pr-8 relative z-10">
                            AI.pollo
                        </h1>
                    </motion.div>

                    <motion.p
                        variants={itemVariants}
                        className="text-xl sm:text-2xl text-white/60 font-medium mb-16 tracking-tight max-w-lg mx-auto"
                    >
                        The music you feel.
                    </motion.p>

                    {/* Premium Magnetic Button */}
                    <motion.div ref={buttonRef} variants={itemVariants} className="w-full sm:w-auto relative z-20 flex flex-col items-center">
                        {user ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full sm:w-auto px-12 py-5 sm:py-6 rounded-full magnetic-btn flex items-center justify-center gap-4 group transition-transform hover:scale-105 active:scale-95 bg-white/10 hover:bg-white/20"
                            >
                                <span className="font-display font-bold text-xl tracking-wide text-white group-hover:text-brand-cyan transition-colors">
                                    Explore Songs →
                                </span>
                            </button>
                        ) : isInAppBrowser ? (
                            <div className="flex flex-col items-center gap-4 max-w-sm mt-4">
                                <div className="true-glass border border-red-500/30 bg-red-500/10 rounded-2xl p-5 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-red-400 font-bold">
                                        <AlertCircle size={20} />
                                        <span>Embedded Browser Detected</span>
                                    </div>
                                    <p className="text-sm text-white/80 leading-relaxed font-light">
                                        Google blocks logging in from embedded browsers like Messenger or Instagram.
                                    </p>
                                    <div className="bg-white/5 rounded-lg p-3 text-sm text-white/90 font-medium tracking-wide leading-relaxed">
                                        Tap the <span className="font-bold text-white text-lg px-0.5 relative top-0.5">•••</span> icon in the top corner and select <span className="text-brand-cyan font-bold px-1">"Open in System Browser"</span> to continue.
                                    </div>
                                </div>
                                <button
                                    disabled
                                    className="w-full sm:w-auto px-12 py-5 sm:py-6 rounded-full flex items-center justify-center gap-4 opacity-50 cursor-not-allowed bg-white/5"
                                >
                                    <span className="font-display font-bold text-xl tracking-wide text-white/50">
                                        Connect with Spotify
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={login}
                                className="w-full sm:w-auto px-12 py-5 sm:py-6 rounded-full magnetic-btn flex items-center justify-center gap-4 group transition-transform hover:scale-105 active:scale-95"
                            >
                                <svg className="w-8 h-8 text-white group-hover:text-spotify transition-colors" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                <span className="font-display font-bold text-xl tracking-wide text-white">
                                    Connect with Spotify
                                </span>
                            </button>
                        )}
                    </motion.div>

                    {/* Infinite Marquee Strip */}
                    <motion.div
                        variants={itemVariants}
                        className="w-[100vw] overflow-hidden mt-16 sm:mt-24 py-4 border-y border-white/5 bg-white/[0.02]"
                    >
                        {/* 
                            Using w-max ensures the track only takes up as much space as the text needs.
                            By duplicating the track twice, the -50% translateX animationloops perfectly across all screen sizes. 
                        */}
                        <div className="flex animate-marquee w-max hover:animation-play-state-paused">
                            {/* Duplicate content 2 times to make the loop seamless */}
                            {[0, 1].map((copyIndex) => (
                                <div key={copyIndex} className="flex gap-12 sm:gap-20 px-6 sm:px-10 items-center">
                                    {shuffledArtists.map((artist, idx) => (
                                        <span key={`${copyIndex}-${idx}`} className="text-white/40 whitespace-nowrap font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                            <div
                                                className="w-2 h-2 rounded-full opacity-70"
                                                style={{
                                                    backgroundColor: artist.color,
                                                    boxShadow: `0 0 12px ${artist.color}`
                                                }}
                                            />
                                            {artist.name}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-10 flex flex-col items-center gap-3 text-white/30"
                >
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase">Discover AI.pollo</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
                </motion.div>
            </main>

            {/* Details Sections */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 sm:py-32 flex flex-col gap-32 sm:gap-40">

                {/* Section 1: What it is */}
                <motion.div
                    variants={featureVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col md:flex-row gap-12 sm:gap-16 items-center"
                >
                    <div className="flex-1 space-y-6 lg:pl-8">
                        <div className="inline-block px-3 py-1 true-glass rounded-full text-brand-cyan text-xs font-bold tracking-wide uppercase mb-2">The Experience</div>
                        <h2 className="font-display text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
                            Discover & Create
                        </h2>
                        <p className="text-lg sm:text-xl text-white/60 leading-relaxed font-light">
                            AI.pollo isn't just an infinite radio station. It's an intelligent music engine designed for absolute discovery. Whether you're feeling energetic, nostalgic, or searching for a late-night sensual vibe, AI.pollo unearths hidden gems and allows you to instantly compile them into permanent, bespoke Spotify playlists with a single click.
                        </p>
                    </div>
                    <div className="flex-1 w-full aspect-square sm:aspect-[4/3] true-glass-strong rounded-[2.5rem] border border-white/5 flex items-center justify-center p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/20 via-transparent to-transparent opacity-50 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-80" />
                        <span className="text-8xl sm:text-9xl opacity-90 animate-float drop-shadow-2xl filter saturate-150">✨</span>
                    </div>
                </motion.div>

                {/* Section 2: How it works */}
                <motion.div
                    variants={featureVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col md:flex-row-reverse gap-12 sm:gap-16 items-center"
                >
                    <div className="flex-1 space-y-8 lg:pr-8">
                        <div className="space-y-4">
                            <div className="inline-block px-3 py-1 true-glass rounded-full text-brand-purple text-xs font-bold tracking-wide uppercase mb-2">The Process</div>
                            <h2 className="font-display text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-white to-white/60 tracking-tight">
                                How It Works
                            </h2>
                        </div>

                        <ul className="space-y-8">
                            <li className="flex gap-5 group">
                                <div className="w-14 h-14 rounded-2xl true-glass flex items-center justify-center flex-shrink-0 text-brand-cyan font-bold text-xl border border-white/5 transition-transform group-hover:scale-110">1</div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-white/90">Connect Your Spotify</h3>
                                    <p className="text-white/50 font-light text-lg">We safely analyze your top tracks, listening history, and the beautiful indie artists you follow to understand your unique taste profile.</p>
                                </div>
                            </li>
                            <li className="flex gap-5 group">
                                <div className="w-14 h-14 rounded-2xl true-glass flex items-center justify-center flex-shrink-0 text-brand-purple font-bold text-xl border border-white/5 transition-transform group-hover:scale-110">2</div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-white/90">Set Your Mood</h3>
                                    <p className="text-white/50 font-light text-lg">Type exactly how you feel ("late night drive", "villain era", "falling in love") or select one of our curated emotional presets.</p>
                                </div>
                            </li>
                            <li className="flex gap-5 group">
                                <div className="w-14 h-14 rounded-2xl true-glass flex items-center justify-center flex-shrink-0 text-indigo-400 font-bold text-xl border border-white/5 transition-transform group-hover:scale-110">3</div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-white/90">Curate & Save to Spotify</h3>
                                    <p className="text-white/50 font-light text-lg">Swipe through your custom recommendations, curate your favorites in the interactive player, and instantly export the entire collection directly to your Spotify library as a brand-new playlist.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="flex-1 w-full aspect-square sm:aspect-[4/3] true-glass-strong rounded-[2.5rem] border border-white/5 flex items-center justify-center p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-bl from-brand-purple/20 via-transparent to-transparent opacity-50 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-80" />
                        <span className="text-8xl sm:text-9xl opacity-90 animate-float drop-shadow-2xl filter saturate-150" style={{ animationDelay: '1s' }}>🎛️</span>
                    </div>
                </motion.div>

                {/* Section 3: Tech Stack */}
                <motion.div
                    variants={featureVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col md:flex-row gap-12 sm:gap-16 items-center"
                >
                    <div className="flex-1 space-y-6 lg:pl-8">
                        <div className="inline-block px-3 py-1 true-glass rounded-full text-indigo-400 text-xs font-bold tracking-wide uppercase mb-2">The Engine</div>
                        <h2 className="font-display text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
                            Behind the Magic
                        </h2>
                        <p className="text-lg sm:text-xl text-white/60 leading-relaxed font-light mb-8">
                            AI.pollo isn't just beautiful—it's engineered for speed. Built entirely with modern, high-performance web technologies to deliver a liquid-smooth experience from login to playback.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            {['React 18', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'FastAPI', 'Python 3', 'Spotify API', 'OAuth 2.0', 'AsyncIO'].map((tech, i) => (
                                <motion.span
                                    key={tech}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 + (i * 0.05) }}
                                    className="px-5 py-2.5 true-glass hover:bg-white/10 transition-colors cursor-default rounded-full text-sm font-medium text-white/80 border border-white/5 shadow-lg"
                                >
                                    {tech}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 w-full aspect-square sm:aspect-[4/3] true-glass-strong rounded-[2.5rem] border border-white/5 flex items-center justify-center p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-transparent to-transparent opacity-50 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-80" />
                        <span className="text-8xl sm:text-9xl opacity-90 animate-float drop-shadow-2xl filter saturate-150" style={{ animationDelay: '2s' }}>⚡</span>
                    </div>
                </motion.div>

            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 text-center text-white/20 hover:text-white/40 transition-colors text-sm font-light border-t border-white/5">
                <p>Designed and engineered for a premium auditory experience.</p>
                <p className="mt-2 text-xs">AI.pollo © {new Date().getFullYear()}</p>
            </footer>

        </div>
    )
}
