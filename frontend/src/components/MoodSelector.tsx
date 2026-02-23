import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '../utils/utils'
import type { MoodId } from '../types'

interface MoodSelectorProps {
    selectedMood: string | null
    onMoodSelect: (mood: string) => void
    onTextSubmit: (text: string) => void
}

const MOOD_OPTIONS: { id: MoodId; emoji: string; label: string }[] = [
    { id: 'happy', emoji: '☀️', label: 'Happy' },
    { id: 'sad', emoji: '🌧️', label: 'Sad' },
    { id: 'energetic', emoji: '⚡', label: 'Energetic' },
    { id: 'chill', emoji: '🍃', label: 'Chill' },
    { id: 'angry', emoji: '🔥', label: 'Angry' },
    { id: 'nostalgic', emoji: '🎞️', label: 'Nostalgic' },
    { id: 'anxious', emoji: '🌊', label: 'Anxious' },
    { id: 'cozy', emoji: '☕', label: 'Cozy' },
    { id: 'melancholic', emoji: '🌑', label: 'Melancholic' },
]

export default function MoodSelector({ selectedMood, onMoodSelect, onTextSubmit }: MoodSelectorProps) {
    const [textInput, setTextInput] = useState('')

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (textInput.trim()) {
            onTextSubmit(textInput.trim())
            setTextInput('')
        }
    }

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05, delayChildren: 0.1 }
        }
    }

    const itemVariants: Variants = {
        hidden: { opacity: 0, scale: 0.8, filter: 'blur(10px)' },
        visible: {
            opacity: 1, scale: 1, filter: 'blur(0px)',
            transition: { type: "spring", stiffness: 300, damping: 20 }
        }
    }

    return (
        <div className="w-full">
            {/* Mood Buttons Grid (Borderless, Floating) */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-3 mb-10"
            >
                {MOOD_OPTIONS.map((mood) => {
                    const isSelected = selectedMood === mood.id

                    return (
                        <motion.button
                            key={mood.id}
                            variants={itemVariants}
                            onClick={() => onMoodSelect(mood.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300 relative group overflow-hidden",
                                isSelected
                                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                    : "true-glass hover:bg-white/10 text-white/80 hover:text-white"
                            )}
                        >
                            {/* Internal glow line on active */}
                            {isSelected && (
                                <motion.div
                                    layoutId="activeGlow"
                                    className="absolute inset-0 rounded-full border border-black/10 mix-blend-overlay"
                                />
                            )}

                            <span className="text-2xl opacity-90">{mood.emoji}</span>
                            <span className="text-base font-display font-bold tracking-wide">{mood.label}</span>
                        </motion.button>
                    )
                })}
            </motion.div>

            {/* Extreme Glass Text Input */}
            <form onSubmit={handleTextSubmit} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Sparkles size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 transition-transform duration-500 group-focus-within:scale-110 group-focus-within:text-white" />
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Describe your current vibe..."
                        className="w-full pl-14 pr-6 py-5 rounded-full true-glass text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-all font-sans text-lg shadow-xl"
                        maxLength={200}
                    />
                </div>

                <motion.button
                    type="submit"
                    disabled={!textInput.trim()}
                    whileHover={{ scale: textInput.trim() ? 1.05 : 1 }}
                    whileTap={{ scale: textInput.trim() ? 0.95 : 1 }}
                    className={cn(
                        "px-8 py-5 rounded-full transition-all duration-500 flex items-center justify-center shadow-2xl relative overflow-hidden group/btn",
                        textInput.trim()
                            ? "bg-white text-black"
                            : "true-glass opacity-50 cursor-not-allowed text-white/50"
                    )}
                >
                    {textInput.trim() && (
                        <div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-12" />
                    )}
                    <span className="font-display font-bold text-lg mr-2 uppercase tracking-wider">Analyze</span>
                    <Send size={20} className={cn("transition-transform duration-300", textInput.trim() && "translate-x-1")} />
                </motion.button>
            </form>
        </div>
    )
}
