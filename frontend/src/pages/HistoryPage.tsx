import React, { useEffect, useState, useMemo } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-8 flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">React Render Crash</h1>
                    <pre className="bg-slate-900 p-4 rounded-xl text-xs overflow-auto max-w-4xl text-left">
                        {this.state.error?.toString()}{'\n'}
                        {this.state.error?.stack}
                    </pre>
                </div>
            )
        }
        return this.props.children
    }
}

function HistoryContent() {
    const [timelineData, setTimelineData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [chartReady, setChartReady] = useState(false)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/api/history/timeline')
                setTimelineData(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
                // Small delay to allow framer-motion to finish its initial layout shift
                // before mounting the Recharts ResponsiveContainer to prevent resize-loop lag
                setTimeout(() => setChartReady(true), 300)
            }
        }
        fetchHistory()
    }, [])

    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']

    const pieData = useMemo(() => {
        if (!timelineData || !timelineData.mood_distribution) return []

        try {
            return Object.entries(timelineData.mood_distribution).map(([name, value]) => ({
                name: String(name),
                value: Number(value)
            }))
        } catch (e) {
            console.error("Failed to parse pie data:", e)
            return []
        }
    }, [timelineData])

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />
            <div className="flex justify-center items-center h-[calc(100vh-64px)] text-slate-500">Loading...</div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Your Mood History</h1>

                <div className="max-w-2xl mx-auto mb-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl flex flex-col items-center">
                        <h2 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-200">Overall Mood Distribution</h2>
                        <div className="h-80 w-full relative flex items-center justify-center">
                            {chartReady ? (
                                <PieChart width={320} height={320}>
                                    <Pie
                                        data={pieData.length > 0 ? pieData : [{ name: "No Data", value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        align="center"
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                </PieChart>
                            ) : (
                                <div className="text-slate-400 animate-pulse">Loading chart...</div>
                            )}
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

export default function HistoryPage() {
    return (
        <ErrorBoundary>
            <HistoryContent />
        </ErrorBoundary>
    )
}
