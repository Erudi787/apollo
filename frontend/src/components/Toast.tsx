import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ToastProps {
    show: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export default function Toast({ show, onClose, title, message }: ToastProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none"
                >
                    <div className="true-glass border border-red-500/30 bg-red-500/10 p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto relative overflow-hidden group">
                        {/* Soft red glow behind the toast */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-50" />

                        <div className="text-red-400 mt-0.5 relative z-10 flex-shrink-0">
                            <AlertCircle className="w-6 h-6" />
                        </div>

                        <div className="flex-1 relative z-10 pr-6">
                            <h3 className="text-white font-semibold text-base mb-1">
                                {title}
                            </h3>
                            <p className="text-white/70 text-sm leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10 bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
