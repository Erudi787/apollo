/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                'mood-happy': '#FFD700',
                'mood-sad': '#4A90D9',
                'mood-energetic': '#FF4500',
                'mood-chill': '#20B2AA',
                'mood-angry': '#8B0000',
                'mood-nostalgic': '#DDA0DD',
                'mood-anxious': '#9370DB',
                'mood-cozy': '#D2691E',
                'mood-melancholic': '#483D8B',
            },
        },
    },
    plugins: []
}