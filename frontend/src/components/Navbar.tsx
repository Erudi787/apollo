import { useAuth } from '../hooks/useAuth'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useContext } from 'react'
import { ThemeContext } from '../context/ThemeContext'

export default function Navbar() {
    const { user, logout } = useAuth()
    const { isDark, toggleTheme } = useContext(ThemeContext)

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">𓏢</span>
                        <span className="text-xl font-bold gradient-text">Apollo</span>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <Sun size={20} className="text-amber-400" />
                            ) : (
                                <Moon size={20} className="text-slate-600" />
                            )}
                        </button>

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

                                <button
                                    onClick={logout}
                                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-slate-500 hover:text-red-500"
                                    aria-label="Log out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
