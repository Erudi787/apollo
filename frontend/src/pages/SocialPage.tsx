import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { motion } from 'framer-motion'
import { Search, UserPlus } from 'lucide-react'

export default function SocialPage() {
    const [feed, setFeed] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

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

    const handleFollow = async (userId: string) => {
        try {
            await api.post(`/api/social/follow/${userId}`)
            alert('Followed successfully!')
            fetchFeed()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Feed */}
                <div className="lg:col-span-2">
                    <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Friends' Activity</h1>

                    {loading ? <p className="text-slate-500">Loading...</p> : (
                        <div className="space-y-6">
                            {feed.length === 0 ? <p className="text-slate-500">No activity yet. Follow some friends!</p> : feed.map((item) => (
                                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        {item.user?.image_url ? (
                                            <img src={item.user.image_url} alt="Profile" className="w-10 h-10 rounded-full" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                {(item.user?.display_name || 'U')[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white">{item.user?.display_name}</p>
                                            <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <p className="text-slate-700 dark:text-slate-300">
                                            Felt <span className="font-bold text-indigo-500">{item.mood}</span> and generated a {item.tracks?.length}-track playlist.
                                        </p>
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
                                    <button onClick={() => handleFollow(u.id)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
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
