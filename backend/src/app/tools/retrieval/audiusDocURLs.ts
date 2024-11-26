// This file contains all the documentation URLs for the Audius API
export interface DocURL {
    path: string;
    title: string;
    description: string;
    category: string;
}

export const audiusDocURLs: DocURL[] = [
    // API Documentation
    {
        path: "/api",
        title: "REST API Quick Start",
        description: "Audius Protocol Documentation",
        category: "api"
    },
    {
        path: "/developers/api/get-user",
        title: "Get User",
        description: "Gets a single user by their user ID",
        category: "api"
    },
    {
        path: "/developers/api/get-track",
        title: "Get Track",
        description: "Gets a track by ID",
        category: "api"
    },
    {
        path: "/developers/api/get-playlist",
        title: "Get Playlist",
        description: "Get a playlist by ID",
        category: "api"
    },
    {
        path: "/developers/api/search-tracks",
        title: "Search Tracks",
        description: "Search for a track or tracks",
        category: "api"
    },
    {
        path: "/developers/api/search-users",
        title: "Search Users",
        description: "Search for users that match the given query",
        category: "api"
    },
    {
        path: "/developers/api/search-playlists",
        title: "Search Playlists",
        description: "Search for a playlist",
        category: "api"
    },
    {
        path: "/developers/api/get-trending-tracks",
        title: "Get Trending Tracks",
        description: "Gets the top 100 trending (most popular) tracks on Audius",
        category: "api"
    },

    // Community SDKs
    {
        path: "/developers/community-projects/go-sdk",
        title: "Go SDK",
        description: "Community-maintained Go implementation of the Audius SDK",
        category: "sdk"
    },
    {
        path: "/developers/community-projects/python-sdk",
        title: "Python SDK",
        description: "Community-maintained Python implementation of the Audius SDK",
        category: "sdk"
    },
    {
        path: "/developers/community-projects/rust-sdk",
        title: "Rust SDK",
        description: "Community-maintained Rust implementation of the Audius SDK",
        category: "sdk"
    },
    // SDK Documentation
    {
        path: "/sdk",
        title: "Javascript SDK",
        description: "Audius Protocol Documentation",
        category: "sdk"
    },
    {
        path: "/developers/sdk/tracks",
        title: "Tracks",
        description: "Track-related SDK methods",
        category: "sdk"
    },
    {
        path: "/developers/sdk/users",
        title: "Users",
        description: "User-related SDK methods",
        category: "sdk"
    },
    {
        path: "/developers/sdk/playlists",
        title: "Playlists",
        description: "Playlist-related SDK methods",
        category: "sdk"
    },

    // Core Concepts
    {
        path: "/learn/concepts/protocol",
        title: "Protocol",
        description: "Understanding the Audius Protocol",
        category: "learn"
    },
    {
        path: "/learn/concepts/token",
        title: "The $AUDIO Token",
        description: "Understanding the Audius token",
        category: "learn"
    }
];
