export interface ParameterConfig {
  required: string[];
  optional: string[];
}

export const apiConfig: Record<string, ParameterConfig> = {
  "/v1/tracks/{track_id}": {
    required: ["track_id"],
    optional: []
  },
  "/v1/tracks/search": {
    required: ["query"],
    optional: ["limit", "offset"]
  },
  "/v1/tracks/trending": {
    required: [],
    optional: ["genre", "time", "limit", "offset"]
  },
  "/v1/tracks": {
    required: ["track_ids"],
    optional: []
  },
  "/v1/tracks/{track_id}/stream": {
    required: ["track_id"],
    optional: []
  },
  "/v1/tracks/trending/underground": {
    required: [],
    optional: ["limit", "offset"]
  },
  "/v1/users/{user_id}": {
    required: ["user_id"],
    optional: []
  },
  "/v1/users/search": {
    required: ["query"],
    optional: ["limit", "offset"]
  },
  "/v1/users/id": {
    required: ["associated_wallet"],
    optional: []
  },
  "/v1/users/{user_id}/favorites": {
    required: ["user_id"],
    optional: ["limit", "offset"]
  },
  "/v1/users/{user_id}/reposts": {
    required: ["user_id"],
    optional: ["limit", "offset"]
  },
  "/v1/users/{user_id}/tags": {
    required: ["user_id"],
    optional: ["limit"]
  },
  "/v1/playlists/{playlist_id}": {
    required: ["playlist_id"],
    optional: []
  },
  "/v1/playlists/search": {
    required: ["query"],
    optional: ["limit", "offset"]
  },
  "/v1/playlists/trending": {
    required: [],
    optional: ["time", "limit", "offset"]
  },
  "/v1/tips": {
    required: ["user_id"],
    optional: ["limit", "offset"]
  },
  "https://api.tavily.com/search": {
    required: ["web-search"],
    optional: []
  }
};
