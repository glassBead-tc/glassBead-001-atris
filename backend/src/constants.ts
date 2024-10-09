import path from "path";

export const TRIMMED_CORPUS_PATH = path.resolve('', '../data/audius_corpus.json');

export const HIGH_LEVEL_CATEGORY_MAPPING = {
  Tracks: [
    "Get Track",
    "Search Tracks",
    "Get Trending Tracks"
  ],
  Users: [
    "Get User",
    "Search Users",
    "Get User By Handle"
  ],
  Playlists: [
    "Get Playlist",
    "Search Playlists"
  ],
  General: [
    "Audius Web Search"
  ]
};
