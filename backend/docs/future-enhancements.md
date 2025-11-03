# Future Enhancements for Apollo

## Mood Detection Improvements

### Dynamic Keyword Expansion via APIs

Currently, mood keywords are manually curated. Future versions could implement dynamic synonym expansion using external APIs.

#### Option 1: Datamuse API Integration
- **URL**: `https://api.datamuse.com/words?ml={word}`
- **Benefits**: Free, no authentication, provides related words and phrases
- **Use case**: Expand mood keywords dynamically based on user input patterns

**Example Implementation:**
```python
@router.get("/expand-mood-keywords/{mood}")
async def expand_keywords(mood: str):
    """Fetch additional synonyms for a mood using Datamuse API"""
    if mood not in MOOD_PROFILES:
        return {"error": "Invalid mood"}

    base_keywords = MOOD_KEYWORDS[mood][:5]
    expanded = set(base_keywords)

    async with httpx.AsyncClient() as client:
        for keyword in base_keywords:
            response = await client.get(
                f"https://api.datamuse.com/words?ml={keyword}"
            )
            synonyms = response.json()
            expanded.update([s['word'] for s in synonyms[:10]])

    return {
        "mood": mood,
        "expanded_keywords": list(expanded)
    }
```

#### Option 2: Urban Dictionary API
- **URL**: `https://api.urbandictionary.com/v0/define?term={term}`
- **Benefits**: Captures modern slang and evolving language
- **Use case**: Keep mood detection current with Gen Z/millennial expressions

#### Option 3: Machine Learning Sentiment Analysis
- **Service**: Hugging Face Inference API
- **Model**: `distilbert-base-uncased-finetuned-sst-2-english`
- **Benefits**: More accurate emotion detection from complex text
- **Drawback**: Requires API key, possible costs

---

## Audio Analysis Enhancements

### Self-Hosted Essentia Integration

When Spotify's audio features were available, they provided valence, energy, and other mood indicators. Since deprecation (Nov 2024), consider:

#### Essentia Python Library
- Extract audio features from Spotify's 30-second preview URLs
- Analyze: valence, energy, tempo, danceability, mood
- Cache results in database for future lookups

**Implementation Notes:**
- Requires `pip install essentia-tensorflow`
- Windows compatibility issues - recommend Linux deployment
- Preview URLs are available in track data from Spotify API

---

## User Feedback Loop

### Mood Detection Accuracy Improvement
Implement feedback mechanism to improve keyword matching over time:

1. After mood detection, ask: "Did we get your mood right?"
2. Store feedback with original text
3. Analyze patterns in misclassified moods
4. Update keyword weights based on user corrections

**Database Schema:**
```python
mood_feedback = {
    "text": str,
    "detected_mood": str,
    "actual_mood": str,
    "confidence": float,
    "timestamp": datetime
}
```

---

## Recommendation Algorithm Improvements

### Genre Blending
Currently uses top 2 genres from mood profile. Could enhance by:
- Weighting genres based on user's listening history
- Combining mood genres with user's preferred genres
- A/B testing different genre combinations

### Collaborative Filtering
- Track which recommendations users actually listen to
- Build user similarity matrix
- Recommend tracks that similar users enjoyed for the same mood

---

## Additional Mood Categories

Consider adding:
- **Motivated** - workout, hustle, grind vibes
- **Romantic** - love songs, intimate moments
- **Focused** - study music, concentration
- **Spiritual** - meditative, transcendent
- **Rebellious** - anti-establishment, punk attitude

---

## Performance Optimizations

### Caching Strategy
- Cache artist genre data (rarely changes)
- Cache search results for mood + genre combinations
- Implement Redis for distributed caching

### Batch Processing
- Fetch multiple artist data in parallel (currently sequential)
- Use `asyncio.gather()` for concurrent API calls

---

## Integration Ideas

### Wearable Devices
- Heart rate → energy level mapping
- Sleep data → recommend chill/energetic music
- Activity tracking → workout playlists

### Weather API Integration
- Rainy day → cozy/melancholic moods
- Sunny → happy/energetic
- Temperature-based recommendations

### Time-based Recommendations
- Morning → energetic
- Midday → focused
- Evening → chill
- Night → melancholic/cozy

---

## Documentation
Last updated: 2025-11-04
Status: Ideas pending implementation
Priority: Medium
