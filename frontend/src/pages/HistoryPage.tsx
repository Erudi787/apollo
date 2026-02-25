import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'

export default function HistoryPage() {
    const [timelineData, setTimelineData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/api/history/timeline')
                setTimelineData(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()
    }, [])

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)] text-slate-500">Loading...</div>
        </div>
    )

    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']

    const pieData = timelineData?.mood_distribution ? Object.entries(timelineData.mood_distribution).map(([name, value]) => ({ name, value })) : []

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Your Mood History</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Overall Mood Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">Recent Playlists</h2>
                <div className="space-y-4">
                    {timelineData?.recent_entries?.map((entry: any) => (
                        <div key={entry.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="font-bold text-lg text-slate-800 dark:text-white">{entry.mood}</p>
                                <p className="text-sm text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="text-sm text-slate-400">{entry.tracks?.length || 0} tracks generated</div>
                        </div>
                    ))}
                    {!timelineData?.recent_entries?.length && (
                        <p className="text-slate-500">No playlists generated yet.</p>
                    )}
                </div>
            </main>
        </div>
    )
}
