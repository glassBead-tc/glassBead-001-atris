import { DatasetSchema } from '../types.js';

export function calculateRelevance(api: DatasetSchema, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();

    // Check for presence of both artist and track name
    if (lowerQuery.includes(" by ") && api.api_name === "Search Tracks") {
        score += 50;
    }

    // Check for exact track name match
    const exactTrackMatch = query.match(/'([^']+)'/);
    if (exactTrackMatch && api.api_name === "Search Tracks") {
        score += 50; // Highest priority for exact track name matches
    }

    if (api.api_name === "Search Tracks" && query.includes("'")) {
        score += 40;
    } else if (api.api_name === "Search Users" && lowerQuery.includes("user")) {
        score += 40;
    } else if (api.api_name === "Search Playlists" && lowerQuery.includes("playlist")) {
        score += 40;
    }

    if (api.api_name === "Search Tracks" && (lowerQuery.includes("track") || lowerQuery.includes("song"))) {
        score += 30;
    }

    if (api.api_name === "Get Track" && lowerQuery.includes("track")) {
        score += 25;
    }

    if (api.api_name === "Search Users" && (lowerQuery.includes("user") || lowerQuery.includes("artist"))) {
        score += 30;
    }

    if (api.api_name === "Get User" && lowerQuery.includes("user")) {
        score += 25;
    }

    if (api.api_name === "Search Playlists" && lowerQuery.includes("playlist")) {
        score += 30;
    }

    if (api.api_name === "Get Playlist" && lowerQuery.includes("playlist")) {
        score += 25;
    }

    if (api.api_name === "Get Trending Tracks" && lowerQuery.includes("trending")) {
        score += 35;
    }

    return score;
}