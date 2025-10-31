MOOD_PROFILES = {
    "happy": {
        "genres": ["pop", "dance", "funk", "disco", "indie-pop"],
        "target_valence": 0.7,  # High positivity
        "target_energy": 0.7,  # High energy
        "description": "Upbeat, cheerful, feel-good vibes",
    },
    "sad": {
        "genres": ["blues", "indie", "acoustic", "singer-songwriter", "soul"],
        "target_valence": 0.3,  # Low positivity
        "target_energy": 0.4,  # Low-medium energy
        "description": "Melancholic, emotional, reflective",
    },
    "energetic": {
        "genres": ["rock", "edm", "hip-hop", "metal", "electronic"],
        "target_valence": 0.6,
        "target_energy": 0.9,  # Very high energy
        "description": "High-intensity, pumped up, powerful",
    },
    "chill": {
        "genres": ["ambient", "lo-fi", "jazz", "r-n-b", "downtempo"],
        "target_valence": 0.5,
        "target_energy": 0.3,  # Very low energy
        "description": "Relaxed, smooth, laid-back",
    },
    "angry": {
        "genres": ["metal", "punk", "hard-rock", "hardcore", "industrial"],
        "target_valence": 0.3,
        "target_energy": 0.95,  # Maximum energy
        "description": "Aggressive, intense, raw emotion",
    },
}
