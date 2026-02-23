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

    return (
        <div className="min-h-screen relative overflow-hidden bg-black text-white font-sans selection:bg-brand-purple selection:text-white">

            {/* Animated Liquid Aura Mesh Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                    <motion.div variants={itemVariants} className="mb-4">
                        <h1 className="font-display text-[5rem] sm:text-[8rem] md:text-[10rem] font-black leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 pb-4">
                            Apollo
                        </h1>
                    </motion.div>

                    <motion.p
                        variants={itemVariants}
                        className="text-xl sm:text-2xl text-white/60 font-medium mb-16 tracking-tight max-w-lg mx-auto"
                    >
                        The music you feel.
                    </motion.p>

                    {/* Premium Magnetic Button */}
                    <motion.div variants={itemVariants} className="w-full sm:w-auto">
                        <button
                            onClick={login}
                            className="w-full sm:w-auto px-12 py-5 sm:py-6 rounded-full magnetic-btn flex items-center justify-center gap-4 group transition-transform hover:scale-105 active:scale-95 z-20"
                        >
                            <svg className="w-8 h-8 text-white group-hover:text-spotify transition-colors" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            <span className="font-display font-bold text-xl tracking-wide text-white">
                                Connect with Spotify
                            </span>
                        </button>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    )
}
