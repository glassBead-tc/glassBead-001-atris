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
