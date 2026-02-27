# 🎧 AI.pollo

An AI-powered mood-based music playlist recommender using the Spotify API. Built with a React/Vite frontend and a FastAPI (serverless) backend deployed on Vercel. The app analyzes user moods manually or via text input and generates personalized Spotify recommendations leveraging a custom Curated Intersect Algorithm based on listening history and curated Spotify playlists.

## 📦 Technologies

- `Vite`
- `React.js`
- `TypeScript`
- `Tailwind CSS`
- `Framer Motion`
- `Python`
- `FastAPI`
- `Spotipy`
- `Vercel`

## 🦄 Features

Here's what you can do with Apollo:

- **Mood Detection**: Determine the current mood either manually (choosing between Happy, Sad, Chill, Energetic, Angry) or by typing a text prompt that gets analyzed.
- **Curated Intersect Algorithm**: Due to Spotify API deprecations, Apollo utilizes a custom algorithm that scrapes tracks from human-curated Spotify playlists matching the selected mood, and algorithmically sorts them against the user's top artists to ensure deep personalization and vibe accuracy.
- **Save to Spotify**: Easily save your custom mood playlists directly to your Spotify account with a single click.
- **Mood History**: Keep track of your mood selections over time with visual history logs and charts to observe your emotional patterns.
- **Social Discovery**: Share your mood playlists and discover what moods or songs are trending among other users.
- **Zero-Latency Track Replacement Queue**: Instantly remove unwanted track recommendations and automatically hot-swap them utilizing an invisible, pre-fetched Reserve ML Queue without triggering loading spinners or recalcuating API data.
- **Machine Learning Feedback System**: Train the algorithm on your specific tastes by interacting with the explicit "Thumbs Up / Thumbs Down" buttons. The internal engine permanently tracks your biases—instantly burying disliked songs and massively boosting the algorithm weights of your favorite artists.
- **Editable Playlist Exports**: Name your collections whatever you desire before exporting them gracefully to your Spotify Library natively.
- **Dynamic iTunes Fallback Audio**: Due to Spotify strictly deprecating the 30-second `preview_url` property in late 2024, Apollo dynamically executes cross-platform data-fetching against Apple's iTunes Search API to seamlessly supply missing immersive 30-second audio previews.
- **Beautiful UI**: Enjoy a rich and interactive dashboard using a premium, responsive glassmorphic design and intuitive Framer Motion animations.
- **Secure Authentication**: Uses robust Spotify OAuth Authorization Code Flow for seamless login perfectly adapted for stateless serverless environments.

## 👩🏽‍🍳 The Process

I started by building a solid backend foundation using FastAPI, focusing on integrating the Spotify OAuth flow to handle access and refresh tokens. Then, I implemented the various core API endpoints to fetch a user's profile, top tracks, and audio features.

Next, I worked on the React/Vite frontend, setting up Tailwind CSS and the core component structure including the authentication pages, dashboard, mood selector, and a fully functional theme system.

The heart of the project was the recommendation engine. After encountering limitations with the deprecated Spotify recommendation endpoints, I engineered the "Curated Intersect Algorithm". This algorithm strategically fetches tracks from specifically curated Spotify playlists based on the detected mood, then scores and filters those tracks using the user's personal top artists data.

As the app grew, I added new pages for Mood History and Social Features, allowing users to track their past vibes and see what's trending. I also implemented seamless functionality to create and save these freshly generated playlists directly into the user's Spotify account.

Finally, I focused heavily on UI/UX, implementing a polished glassmorphic interface, smooth Framer Motion animations, and fully migrating the stack to Vercel for serverless deployment, ensuring proper stateless authentication and environment variable management.

## 📚 What I Learned

During this project, I've picked up important skills and a better understanding of building full-stack applications with third-party APIs:

### 🧠 OAuth, Spotify Integration & Serverless:
- **Authentication Flow**: I learned to navigate the Spotify OAuth 2.0 flow, properly managing access tokens via secure cookies, and adapting this flow to work immaculately in a stateless, serverless Vercel environment.
- **API Workarounds**: I learned how to deal with deprecated external API endpoints by engineering custom data-scraping and intersection algorithms to achieve the same or better results.

### 📐 Building Recommendation Algorithms:
- **Scoring Logic**: I developed an understanding of building basic recommendation engines, mapping abstract concepts like "moods" to curated public datasets and dynamically scoring items against a user's personal preferences.

### 🎨 React & Advanced UI:
- **State Management**: Managing complex states across the application, especially dealing with asynchronous API calls and user authentication states.
- **Animations & Styling**: Using Tailwind CSS and Framer Motion to elevate the user interface with premium aesthetics like glassmorphism and micro-animations.

### 🚀 Backend with FastAPI:
- **API Design**: Building clean, RESTful endpoints to connect the React frontend with complex backend processing logic.
- **Vercel Deployments**: Configuring ASGI FastAPI applications to run seamlessly as serverless functions on Vercel.

## 🚦 Security & API Limitations

> [!CAUTION]
> **In-App Browser Blocks**: Google's modern OAuth 2.0 security policies strictly forbid authentication requests originating from embedded WebViews (e.g. clicking a link from inside the Facebook Messenger or Instagram apps). Attempting this will trigger a **Google 403 Error**. Apollo detects this and provides UI instructions for iOS/Android users to safely "Open in System Browser" (Safari/Chrome).

> [!WARNING]
> **Spotify Production Limits**: Due to major updates in Spotify's Developer Policy regarding AI apps, this application operates under Spotify API's strictly limited **"Development Mode"**. 
> 
> As of the February 2026 policy changes, Spotify enforces a hard cap of **5 manually whitelisted test users** for all indie applications without a verified business contract. Unregistered accounts will experience a redirect loop failure upon attempting to login.
> 
> **How to Test Apollo:**
> Because of this Catch-22 limitation, the live deployment link acts primarily as a UI/UX and architectural portfolio showcase. To actually authenticate and generate playlists yourself:
> 1. Fork this repository and create your own Spotify Developer App (add your credentials to `.env`).
> 2. Or, contact me to be manually whitelisted as one of the 5 authorized test users on the Spotify Developer Dashboard.

## 💭 Future Roadmap & Improvements

- **Spotify Blend Integration**: Introduce collaborative AI playlists where multiple users' "Top Artists" datasets are ingested into the Curated Intersect Algorithm to generate a perfect acoustic middle-ground for road trips or parties.
- **Dynamic Track Lyrics**: Integrate the Musixmatch API to fetch and display synchronized lyrics directly inside the `TrackCard` component when a user plays the 30-second audio preview.
- **Advanced Historical Analytics**: Expand the `/history` dashboard beyond just mood pie-charts to include interactive temporal heatmaps showing exactly what days and times certain moods spike in the user's life.

## 🚦 Running the Project

To run the project in your local environment, follow these steps:

1. Clone the repository to your local machine.
2. Set up a Spotify Developer Account, create an app, and obtain a `Client ID` and `Client Secret`.
3. Set the Redirect URI in the Spotify Dashboard (e.g., `http://localhost:5173/callback`).
4. In the `backend` directory, create a `.env` file with your Spotify credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`).
5. In the `backend` directory, create a Python virtual environment, run `pip install -r requirements.txt`, and start the FastAPI server with `uvicorn main:app --reload`.
6. In the `frontend` directory, run `npm install` to install frontend dependencies.
7. Run `npm run dev` in the `frontend` directory to start the Vite development server.
8. Open [http://localhost:5173](http://localhost:5173) (or the address shown in your console) to view the app and log in with Spotify.
