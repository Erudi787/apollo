import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/history', label: 'History' },
    { to: '/social', label: 'Social' },
    { to: '/blend', label: 'Blend', startsWith: true },
]

export default function Navbar() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)

    const isActive = (link: typeof navLinks[0]) =>
        link.startsWith ? location.pathname.startsWith(link.to) : location.pathname === link.to

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" onClick={() => setMobileOpen(false)}>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">𓏢</span>
                            <span className="text-xl font-bold gradient-text">AI.pollo</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    {user && (
                        <div className="hidden md:flex items-center gap-6 ml-8">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`font-medium transition-colors ${isActive(link) ? 'text-indigo-500' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-400'}`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Right Side */}
                    <div className="flex items-center gap-3">

                        {/* User Profile */}
                        {user && (
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block text-right">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {user.display_name || 'Spotify User'}
                                    </p>
                                </div>

                                {user.images?.[0]?.url ? (
                                    <img
                                        src={user.images[0].url}
                                        alt={user.display_name || 'User'}
                                        className="w-8 h-8 rounded-full ring-2 ring-indigo-400/50"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                        {(user.display_name || 'U')[0].toUpperCase()}
                                    </div>
                                )}

                                {/* Logout - visible on desktop */}
                                <button
                                    onClick={logout}
                                    className="hidden md:block p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-slate-500 hover:text-red-500"
                                    aria-label="Log out"
                                >
                                    <LogOut size={18} />
                                </button>

                                {/* Hamburger Toggle - visible only on mobile */}
                                <button
                                    onClick={() => setMobileOpen(prev => !prev)}
                                    className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                                    aria-label="Toggle menu"
                                >
                                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {mobileOpen && user && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="md:hidden overflow-hidden border-t border-slate-800/50"
                    >
                        <div className="px-4 py-4 space-y-1 bg-slate-950/90 backdrop-blur-xl">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMobileOpen(false)}
                                    className={`block px-4 py-3 rounded-xl font-medium text-base transition-all ${isActive(link)
                                            ? 'bg-indigo-500/10 text-indigo-400'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {/* Mobile Logout */}
                            <button
                                onClick={() => { setMobileOpen(false); logout(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-base text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <LogOut size={18} />
                                Log out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
