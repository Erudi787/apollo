import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function CallbackHandler() {
    const navigate = useNavigate()
    const { checkAuth } = useAuth()

    useEffect(() => {
        const handleCallback = async () => {
            // Extract tokens from the URL fragment hash
            const hash = window.location.hash.substring(1)
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')

            if (accessToken && refreshToken) {
                // Save tokens to localStorage
                localStorage.setItem('access_token', accessToken)
                localStorage.setItem('refresh_token', refreshToken)

                // Remove the tokens from the URL for security/cleanliness
                window.history.replaceState(null, '', window.location.pathname)
            }

            // Verify auth against backend
            await checkAuth()
            navigate('/dashboard', { replace: true })
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
