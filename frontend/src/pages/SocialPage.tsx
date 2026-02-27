import { useEffect, useState, useMemo } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, CheckCircle2, XCircle } from 'lucide-react'

export default function SocialPage() {
    const [feed, setFeed] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Group consecutive items by the same user to prevent feed clutter
    const groupedFeed = useMemo(() => {
        return feed.reduce((acc, curr) => {
            if (acc.length === 0) {
                acc.push({ user: curr.user, activities: [curr] })
            } else {
                const lastGroup = acc[acc.length - 1]
                if (lastGroup.user && curr.user && lastGroup.user.id === curr.user.id) {
                    lastGroup.activities.push(curr)
                } else {
                    acc.push({ user: curr.user, activities: [curr] })
                }
            }
            return acc
        }, [] as any[])
    }, [feed])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchFeed()
    }, [])

    const fetchFeed = async () => {
        try {
            const res = await api.get('/api/social/feed')
            setFeed(res.data.feed)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery) return
        try {
            const res = await api.get(`/api/social/search-users?q=${searchQuery}`)
            setSearchResults(res.data.users)
        } catch (err) {
            console.error(err)
        }
    }

    const handleFollow = async (userId: string, userName: string) => {
        try {
            await api.post(`/api/social/follow/${userId}`)

            // Show success toast instead of alert
            setToast({ message: `Successfully followed ${userName}!`, type: 'success' })

            // Auto-refresh logic
            fetchFeed()
            setSearchQuery('')
            setSearchResults([])
        } catch (err) {
            console.error(err)
            setToast({ message: `Failed to follow user.`, type: 'error' })
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
            <Navbar />

            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-lg ${toast.type === 'success'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 font-semibold'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 font-semibold'
                            }`}
                        style={{ backdropFilter: 'blur(12px)' }}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Feed */}
                <div className="lg:col-span-2">
                    <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Friends' Activity</h1>

                    {loading ? <p className="text-slate-500">Loading...</p> : (
                        <div className="space-y-6">
                            {groupedFeed.length === 0 ? <p className="text-slate-500">No activity yet. Follow some friends!</p> : groupedFeed.map((group: any) => (
                                <motion.div key={group.activities[0].id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        {group.user?.image_url ? (
                                            <img src={group.user.image_url} alt="Profile" className="w-10 h-10 rounded-full" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                {(group.user?.display_name || 'U')[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white">{group.user?.display_name}</p>
                                            <p className="text-xs text-slate-500">{new Date(group.activities[0].timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {group.activities.map((item: any, idx: number) => (
                                            <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/80">
                                                <p className="text-slate-700 dark:text-slate-300">
                                                    Felt <span className="font-bold text-indigo-500">{item.mood}</span> and generated a {item.tracks?.length || 0}-track playlist.
                                                </p>
                                                {idx > 0 && (
                                                    <span className="text-xs text-slate-400 font-medium bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-md w-fit">
                                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Bar sidebar */}
                <div>
                    <div className="glass-card p-6 rounded-2xl sticky top-24">
                        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Find Friends</h2>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none text-slate-800 dark:text-white"
                            />
                            <button type="submit" className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors">
                                <Search size={20} />
                            </button>
                        </form>

                        <div className="space-y-4">
                            {searchResults.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        {u.image_url ? <img src={u.image_url} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-slate-500" />}
                                        <p className="font-medium text-slate-800 dark:text-white">{u.display_name}</p>
                                    </div>
                                    <button onClick={() => handleFollow(u.id, u.display_name)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                                        <UserPlus size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
