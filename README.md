# 🎧 Apollo

An AI-powered mood-based music playlist recommender using the Spotify API. Built with a React/Vite frontend and a FastAPI backend. The app analyzes user moods manually or via text input and generates personalized Spotify recommendations based on listening history and mood profiles.

## 📦 Technologies

- `Vite`
- `React.js`
- `TypeScript`
- `Tailwind CSS`
- `Framer Motion`
- `Python`
- `FastAPI`
- `Spotipy`

## 🦄 Features

Here's what you can do with Apollo:

- **Mood Detection**: Determine the current mood either manually (choosing between Happy, Sad, Chill, Energetic, Angry) or by typing a text prompt that gets analyzed.
- **Personalized Recommendations**: Receives track recommendations based on user's top Spotify tracks and their current mood, utilizing a curated scoring algorithm on tracks' audio features (valence, energy, tempo, danceability).
- **Beautiful UI**: Enjoy a rich and interactive dashboard using a premium, responsive glassmorphic design and intuitive animations.
- **Secure Authentication**: Uses robust Spotify OAuth Authorization Code Flow for seamless login and seamless Spotify integration.

## 👩🏽‍🍳 The Process

I started by building a solid backend foundation using FastAPI, focusing on integrating the Spotify OAuth flow to handle access and refresh tokens. Then, I implemented the various core API endpoints to fetch a user's profile, top tracks, and audio features.

Next, I worked on the React/Vite frontend, setting up Tailwind CSS and the core component structure including the authentication pages, dashboard, mood selector, and a fully functional theme system.

With the foundational components ready, I focused on the core mood detection logic. I implemented a manual mood selector mapped to specific colors and an initial text-based sentiment analysis process. 

The heart of the project was the recommendation engine. I mapped each mood to specific Spotify audio feature constraints (valence, energy, tempo, danceability), then built an algorithm that scores and sorts a user's tracks against the detected mood profile.

Finally, I focused heavily on UI/UX, implementing a polished glassmorphic interface, smooth Framer Motion animations, and responsive layouts across all devices.

## 📚 What I Learned

During this project, I've picked up important skills and a better understanding of building full-stack applications with third-party APIs:

### 🧠 OAuth & Spotify Integration:
- **Authentication Flow**: I learned to navigate the Spotify OAuth 2.0 flow, properly managing access tokens and handling refresh tokens via secure cookies in a FastAPI backend.
- **Data Utilization**: I gained experience pulling complex music data, analyzing track audio features, and building logic around third-party datasets.

### 📐 Building Recommendation Algorithms:
- **Scoring Logic**: I developed an understanding of building basic recommendation engines, mapping abstract concepts like "moods" to concrete data points (valence, energy) and dynamically scoring items.

### 🎨 React & Advanced UI:
- **State Management**: Managing complex states across the application, especially dealing with asynchronous API calls and user authentication states.
- **Animations & Styling**: Using Tailwind CSS and Framer Motion to elevate the user interface with premium aesthetics like glassmorphism and micro-animations.

### 🚀 Backend with FastAPI:
- **API Design**: Building clean, RESTful endpoints to connect the React frontend with complex backend processing logic.

## 💭 How can it be improved?

- Implement a machine-learning model that learns from user feedback for more advanced personalization.
- Add an automated "Create Playlist" button that saves the mood playlist directly to the user's Spotify account.
- Include a Mood History feature with charts tracking the timeline of user's moods and song selections.
- Add social features to share mood playlists and discover what moods or songs are trending among friends.

## 🚦 Running the Project

To run the project in your local environment, follow these steps:

1. Clone the repository to your local machine.
2. Set up a Spotify Developer Account, create an app, and obtain a `Client ID` and `Client Secret`.
3. Set the Redirect URI in the Spotify Dashboard (e.g., `http://localhost:5173/callback`).
4. In the `backend` directory, create a `.env` file with your Spotify credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`) and any other necessary environment variables.
5. In the `backend` directory, create a Python virtual environment, run `pip install -r requirements.txt`, and start the FastAPI server with `uvicorn main:app --reload` (or the respective run command).
6. In the `frontend` directory, run `npm install` to install frontend dependencies.
7. Run `npm run dev` in the `frontend` directory to start the Vite development server.
8. Open [http://localhost:5173](http://localhost:5173) (or the address shown in your console) to view the app and log in with Spotify.
