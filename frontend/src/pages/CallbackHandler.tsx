import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function CallbackHandler() {
    const navigate = useNavigate()
    const { checkAuth } = useAuth()

    useEffect(() => {
        const handleCallback = async () => {
            // After Spotify redirects here, our backend has already set
            // the cookies. We just need to verify auth and redirect.
            await checkAuth()
            navigate('/', { replace: true })
        }

        handleCallback()
    }, [checkAuth, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg">
            <div className="text-center animate-fade-in">
                <div className="text-6xl mb-6 animate-float">𓏢</div>
                <div className="mb-4">
                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
                <p className="text-slate-300 text-lg font-medium">Connecting to Spotify...</p>
                <p className="text-slate-500 text-sm mt-2">Just a moment while we set things up.</p>
            </div>
        </div>
    )
}
