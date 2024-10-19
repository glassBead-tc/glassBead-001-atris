<!--
   Recommendation
   Given that the SDK is designed to handle all interactions with the Audius API efficiently and is maintained by the Audius team, it would be best to refactor your codebase to use only the SDK.
   Refactoring Plan
   Audit the Codebase:
   Identify all instances where manual API configurations and calls are being used.
   List out the endpoints and functionalities covered by your custom implementation.
   Map Custom Implementations to SDK Methods:
   For each custom API call in audiusApi.ts, find the equivalent method in the SDK.
   Ensure that all functionalities you require are supported by the SDK.
   Refactor API Calls:
   Replace manual API calls with the corresponding SDK methods.
   Update any custom logic that was handling parameters, error handling, or response parsing to align with the SDK's mechanisms.
   Remove Redundant Configurations:
   Delete audiusApiConfig.ts, audius_corpus.json, and any other files related to manual API configuration.
   Ensure that any documentation or comments are updated to reflect the use of the SDK.
   Update Import Paths:
   Adjust import statements throughout the codebase to import functions and classes from the SDK rather than your custom modules.
   Adjust Utility Functions:
   Review utility functions in your tools directory that might be parsing responses or handling errors.
   If the SDK provides built-in handling for these cases, consider removing or updating your utility functions accordingly.
   Testing:
   Thoroughly test all functionalities to ensure that replacing manual implementations with the SDK does not introduce any regressions.
   Pay special attention to edge cases and error handling.
   Performance Considerations:
   Benchmark the application before and after refactoring to ensure that performance has not degraded.
   The SDK is likely optimized, but it's good practice to verify.
   Documentation:
   Update your project's documentation to reflect the changes.
   Provide guidelines for other developers on how to use the SDK within your project.

   **Note to Future Assistant**: Remove this comment block once the task associated with this file ("codebase_audit.md") is complete.
   -->

# Codebase Audit

## Overview

This document lists all instances where manual API configurations and calls are being used in the codebase, as well as the endpoints and functionalities covered by the custom implementation. The goal is to identify areas where the Audius SDK can replace manual implementations to simplify the codebase and reduce duplication.

---

## Manual API Configurations and Calls

### 1. **`backend/app/audiusApiConfig.ts`**

- Contains manual definitions of API endpoints, required, and optional parameters.
- Exposes `apiConfig` object with endpoint configurations.
- Used throughout the application for constructing API requests manually.

### 2. **`backend/app/data/audius_corpus.json`**

- JSON file containing metadata about API endpoints.
- Includes endpoint IDs, category names, tool names, API names, descriptions, parameters, methods, template responses, and API URLs.
- Serves as a reference or documentation for the custom API implementation.

### 3. **`backend/app/services/audiusApi.ts`**

- Custom implementation of API calls to Audius services.
- Uses manual HTTP requests, possibly with `axios`, to interact with the Audius API.
- Functions include:

  - `getUserTracks(userId: string, limit: number)`: Retrieves a user's tracks.
  - `searchGenres(query: string, limit: number)`: Searches for genres.
  - `searchTracks(query: string, limit: number)`: Searches for tracks.
  - `searchUsers(query: string, limit: number)`: Searches for users.
  - `searchPlaylists(query: string, limit: number)`: Searches for playlists.
  - `getTrendingTracks(limit: number)`: Retrieves trending tracks.
  - `getUserFollowers(userId: string, limit: number)`: Retrieves followers of a user.
  - `getUserFollowing(userId: string, limit: number)`: Retrieves users that a specific user is following.
  - `getTrackPlayCount(trackId: string)`: Retrieves the play count for a specific track.

- Implements custom error handling and response parsing.

### 4. **`backend/app/graph/process_api_response.ts`**

- Processes API responses manually.
- Contains functions like:

  - `processApiResponse(state: GraphState)`: Processes the response based on query type.
  - `processUserQuery(state: GraphState)`: Generates formatted string for user queries.
  - `formatTrendingTracks(tracks: TrackData[], limit: number)`: Formats trending tracks.
  - `formatTrendingGenres(tracks: TrackData[], limit: number)`: Formats trending genres.

### 5. **`backend/app/tools/utils/formatResults.ts`**

- Manually formats API responses.
- Functions include:

  - `formatTrackResults(response: any, originalQuery: string)`: Formats track results.
  - `formatApiResults(response: any, apiName: string)`: Formats API results based on API name.
  - `formatSearchTracks(tracks: any[], query: string)`: Formats search tracks results.
  - `formatUserInfo(data: any, query: string)`: Formats user information.
  - `formatPlaylistInfo(data: any[], query: string, fullPlaylistDetails?: any)`: Formats playlist information.
  - `formatTrendingTracks(tracks: any[])`: Formats trending tracks.
  - `formatTrendingPlaylists(data: any[])`: Formats trending playlists.
  - `formatDetailedTrackInfo(tracks: any[])`: Formats detailed track information.
  - `formatMultipleTracks(tracks: any[])`: Formats multiple tracks.
  - `formatPlaylistResults(playlists: any[])`: Formats playlist results.
  - `formatUserResults(users: any[])`: Formats user results.
  - `formatTrendingResults(trending: any[], type: 'tracks' | 'playlists')`: Formats trending results.

### 6. **`backend/app/graph/nodes/handlerFunctions.ts`**

- Contains handler functions that make manual API calls or use manual configurations.
- Functions include:

  - `handle_search_genres(state: GraphState)`: Handles genre search queries.
  - `handle_entity_query(state: GraphState)`: Handles general entity queries.
  - `handle_search_tracks(state: GraphState)`: Handles track search queries.
  - `handle_playlist_info(state: GraphState)`: Handles playlist information queries.
  - `handle_search_users(state: GraphState)`: Handles user search queries.
  - `handle_trending_tracks(state: GraphState)`: Handles trending tracks queries.

- These functions often construct API requests manually and process responses without using the SDK.

### 7. **Utility Functions in `backend/app/tools/`**

- **`extractParameters.ts`**: Manually extracts parameters from queries.
- **`calculateGenrePopularity.ts`**: Manually calculates genre popularity from data.
- **`audiusApiConfig.ts`** and related utilities: Used for mapping and configuring API endpoints manually.

---

## Endpoints and Functionalities Covered by Custom Implementation

The custom implementation covers the following Audius API endpoints and functionalities:

1. **Tracks**

   - **Get Track by ID** (`/v1/tracks/{track_id}`)
     - Function: `getTrackById(trackId: string)`
   - **Search Tracks** (`/v1/tracks/search`)
     - Function: `searchTracks(query: string, limit: number)`
   - **Get Trending Tracks** (`/v1/tracks/trending`)
     - Function: `getTrendingTracks(limit: number)`
   - **Get Trending Underground Tracks** (`/v1/tracks/trending/underground`)
     - Not directly listed but may be included.

2. **Users**

   - **Get User by ID** (`/v1/users/{user_id}`)
     - Function: `getUserById(userId: string)`
   - **Search Users** (`/v1/users/search`)
     - Function: `searchUsers(query: string, limit: number)`
   - **Get User Followers** (`/v1/users/{user_id}/followers`)
     - Function: `getUserFollowers(userId: string, limit: number)`
   - **Get User Following** (`/v1/users/{user_id}/following`)
     - Function: `getUserFollowing(userId: string, limit: number)`

3. **Playlists**

   - **Get Playlist by ID** (`/v1/playlists/{playlist_id}`)
     - Function: `getPlaylistById(playlistId: string)`
   - **Search Playlists** (`/v1/playlists/search`)
     - Function: `searchPlaylists(query: string, limit: number)`
   - **Get Trending Playlists** (`/v1/playlists/trending`)
     - Not explicitly listed but may be included.

4. **Genres**

   - **Search Genres** (Custom Implementation)
     - Function: `searchGenres(query: string, limit: number)`
     - Note: The Audius API doesn't have a direct endpoint for genres; this may be a custom solution.

5. **Additional Functionalities**

   - **Get Track Play Count**
     - Function: `getTrackPlayCount(trackId: string)`
     - May involve aggregating data from multiple calls or custom calculations.
   - **Calculate Genre Popularity**
     - Custom calculation based on track data.
   - **Process and Format API Responses**
     - Custom logic to format responses for use in the application.

---

## Summary

The codebase contains several instances where manual API configurations and calls are implemented instead of using the Audius SDK. Key areas include:

- Manual endpoint definitions and parameter configurations.
- Custom HTTP requests to the Audius API.
- Custom error handling and response parsing.
- Utility functions that replicate SDK functionalities.

By refactoring the code to use the Audius SDK, we can simplify the codebase, reduce duplication, and leverage the robust features and error handling provided by the SDK.

---

