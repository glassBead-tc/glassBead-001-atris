import path from "path";

export const TRIMMED_CORPUS_PATH = path.resolve('', '../data/audius_corpus.json');

export const HIGH_LEVEL_CATEGORY_MAPPING = {
  Tracks: [
    "Get Track",
    "Search Tracks",
    "Get Trending Tracks",
    "Get Bulk Tracks",
    "Get Underground Trending Tracks",
    "Stream Track"
  ],
  Users: [
    "Get User",
    "Search Users",
    "Get User By Handle",
    "Get User ID from Wallet",
    "Get User's Favorite Tracks",
    "Get User's Reposts",
    "Get User's Most Used Track Tags"
  ],
  Playlists: [
    "Get Playlist",
    "Search Playlists",
    "Get Trending Playlists"
  ],
  General: [
    "Audius Web Search"
  ],
  Tips: [
    "Get Tips"
  ]
};

export enum Genre {
  ALL = 'All Genres',
  ELECTRONIC = 'Electronic',
  ROCK = 'Rock',
  METAL = 'Metal',
  ALTERNATIVE = 'Alternative',
  HIP_HOP_RAP = 'Hip-Hop/Rap',
  EXPERIMENTAL = 'Experimental',
  PUNK = 'Punk',
  FOLK = 'Folk',
  POP = 'Pop',
  AMBIENT = 'Ambient',
  SOUNDTRACK = 'Soundtrack',
  WORLD = 'World',
  JAZZ = 'Jazz',
  ACOUSTIC = 'Acoustic',
  FUNK = 'Funk',
  R_AND_B_SOUL = 'R&B/Soul',
  DEVOTIONAL = 'Devotional',
  CLASSICAL = 'Classical',
  REGGAE = 'Reggae',
  PODCASTS = 'Podcasts',
  COUNTRY = 'Country',
  SPOKEN_WORK = 'Spoken Word',
  COMEDY = 'Comedy',
  BLUES = 'Blues',
  KIDS = 'Kids',
  AUDIOBOOKS = 'Audiobooks',
  LATIN = 'Latin',
  LOFI = 'Lo-Fi',
  HYPERPOP = 'Hyperpop',
  DANCEHALL = 'Dancehall',

  // Electronic Subgenres
  TECHNO = 'Techno',
  TRAP = 'Trap',
  HOUSE = 'House',
  TECH_HOUSE = 'Tech House',
  DEEP_HOUSE = 'Deep House',
  DISCO = 'Disco',
  ELECTRO = 'Electro',
  JUNGLE = 'Jungle',
  PROGRESSIVE_HOUSE = 'Progressive House',
  HARDSTYLE = 'Hardstyle',
  GLITCH_HOP = 'Glitch Hop',
  TRANCE = 'Trance',
  FUTURE_BASS = 'Future Bass',
  FUTURE_HOUSE = 'Future House',
  TROPICAL_HOUSE = 'Tropical House',
  DOWNTEMPO = 'Downtempo',
  DRUM_AND_BASS = 'Drum & Bass',
  DUBSTEP = 'Dubstep',
  JERSEY_CLUB = 'Jersey Club',
  VAPORWAVE = 'Vaporwave',
  MOOMBAHTON = 'Moombahton'
}

export enum Mood {
  PEACEFUL = 'Peaceful',
  ROMANTIC = 'Romantic',
  SENTIMENTAL = 'Sentimental',
  TENDER = 'Tender',
  EASYGOING = 'Easygoing',
  YEARNING = 'Yearning',
  SOPHISTICATED = 'Sophisticated',
  SENSUAL = 'Sensual',
  COOL = 'Cool',
  GRITTY = 'Gritty',
  MELANCHOLY = 'Melancholy',
  SERIOUS = 'Serious',
  BROODING = 'Brooding',
  FIERY = 'Fiery',
  DEFIANT = 'Defiant',
  AGGRESSIVE = 'Aggressive',
  ROWDY = 'Rowdy',
  EXCITED = 'Excited',
  ENERGIZING = 'Energizing',
  EMPOWERING = 'Empowering',
  STIRRING = 'Stirring',
  UPBEAT = 'Upbeat',
  OTHER = 'Other'
}

export enum StemCategory {
  INSTRUMENTAL = 'INSTRUMENTAL',
  LEAD_VOCALS = 'LEAD_VOCALS',
  MELODIC_LEAD = 'MELODIC_LEAD',
  PAD = 'PAD',
  SNARE = 'SNARE',
  KICK = 'KICK',
  HIHAT = 'HIHAT',
  PERCUSSION = 'PERCUSSION',
  SAMPLE = 'SAMPLE',
  BACKING_VOX = 'BACKING_VOX',
  BASS = 'BASS',
  OTHER = 'OTHER'
}

