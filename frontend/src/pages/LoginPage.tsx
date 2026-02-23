import { useAuth } from '../hooks/useAuth'
import { motion, type Variants } from 'framer-motion'

export default function LoginPage() {
    const { login } = useAuth()

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
        <div className="min-h-screen relative overflow-x-hidden bg-black text-white font-sans selection:bg-brand-purple selection:text-white">

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

                        <h1 className="font-display text-[5rem] sm:text-[8rem] md:text-[10rem] font-black leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 pb-4 relative z-10">
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
                    <motion.div variants={itemVariants} className="w-full sm:w-auto relative z-20">
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
                    </motion.div>

                    {/* Infinite Marquee Strip */}
                    <motion.div
                        variants={itemVariants}
                        className="w-[100vw] overflow-hidden mt-16 sm:mt-24 py-4 border-y border-white/5 bg-white/[0.02] relative left-1/2 -translate-x-1/2"
                    >
                        <div className="flex animate-marquee whitespace-nowrap w-[200%] hover:animation-play-state-paused">
                            {/* Duplicate content to make the loop seamless */}
                            {[1, 2].map((i) => (
                                <div key={i} className="flex gap-8 sm:gap-16 items-center px-4 sm:px-8 w-1/2 justify-around">
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-cyan/50 shadow-[0_0_10px_rgba(0,242,254,0.5)]" />
                                        Chase Atlantic
                                    </span>
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-purple/50 shadow-[0_0_10px_rgba(79,172,254,0.5)]" />
                                        SZA
                                    </span>
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                        sombr
                                    </span>
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-cyan/50 shadow-[0_0_10px_rgba(0,242,254,0.5)]" />
                                        Luke Chiang
                                    </span>
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-purple/50 shadow-[0_0_10px_rgba(79,172,254,0.5)]" />
                                        Emotional Oranges
                                    </span>
                                    <span className="text-white/40 font-display font-medium text-lg sm:text-2xl tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                        Galdive
                                    </span>
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
                            Vibe-Based Discovery
                        </h2>
                        <p className="text-lg sm:text-xl text-white/60 leading-relaxed font-light">
                            AI.pollo isn't just another generic playlist generator. It's an intelligent mood engine that understands the nuanced feelings behind the music you love. Whether you're feeling energetic, nostalgic, or searching for a late-night sensual vibe, AI.pollo curates the perfect soundtrack based on your exact wavelength.
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
                                    <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-white/90">Experience the Magic</h3>
                                    <p className="text-white/50 font-light text-lg">Our lightning-fast parallel search engine builds a completely custom, deduplicated playlist tailored specifically to you—ready to play or save.</p>
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
