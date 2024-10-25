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

   **Note to Future Assistant**: Remove this comment block once the task associated with this file ("custom_implementation_map.md") is complete.
   -->

# Custom Implementation Map

## Overview

This document maps each custom API call in `audiusApi.ts` and other custom implementations to their equivalent methods in the Audius SDK. The goal is to ensure all functionalities required by the application are supported by the SDK and to plan for a smooth transition during the refactoring process.

---

## Mapping of Custom Implementations to SDK Methods

### 1. **Tracks**

#### a. **Get Track by ID**

- **Custom Implementation:**
  - Function: `getTrackById(trackId: string)`
  - Description: Fetches a track by its ID using a manual API call.

- **SDK Equivalent:**
  - Method: `audiusSdk.tracks.getTrack({ trackId })`
  - Import Path: `audiusSdk.tracks.getTrack`
  - Notes: Supports fetching a track by ID. The SDK handles parameters and error handling internally.

#### b. **Search Tracks**

- **Custom Implementation:**
  - Function: `searchTracks(query: string, limit: number)`
  - Description: Searches for tracks based on a query string.

- **SDK Equivalent:**
  - Method: `audiusSdk.tracks.searchTracks({ query, limit })`
  - Import Path: `audiusSdk.tracks.searchTracks`
  - Notes: Directly supports searching tracks with optional limit and offset.

#### c. **Get Trending Tracks**

- **Custom Implementation:**
  - Function: `getTrendingTracks(limit: number)`
  - Description: Retrieves a list of trending tracks.

- **SDK Equivalent:**
  - Method: `audiusSdk.tracks.getTrendingTracks({ limit, time })`
  - Import Path: `audiusSdk.tracks.getTrendingTracks`
  - Notes: Supports fetching trending tracks with parameters for limit and time range. The `time` parameter can be `week`, `month`, or `allTime`.

#### d. **Get Track Play Count**

- **Custom Implementation:**
  - Function: `getTrackPlayCount(trackId: string)`
  - Description: Retrieves the play count for a specific track.

- **SDK Equivalent:**
  - Method: `audiusSdk.tracks.getTrack({ trackId })`
  - Accessing `playCount` property from the track data.
  - Notes: The SDK's `getTrack` method returns track details, including `playCount`.

### 2. **Users**

#### a. **Get User by ID**

- **Custom Implementation:**
  - Function: `getUserById(userId: string)`
  - Description: Fetches a user's details by their ID.

- **SDK Equivalent:**
  - Method: `audiusSdk.users.getUser({ userId })`
  - Import Path: `audiusSdk.users.getUser`
  - Notes: Supports fetching user information by ID.

#### b. **Search Users**

- **Custom Implementation:**
  - Function: `searchUsers(query: string, limit: number)`
  - Description: Searches for users based on a query string.

- **SDK Equivalent:**
  - Method: `audiusSdk.users.searchUsers({ query, limit })`
  - Import Path: `audiusSdk.users.searchUsers`
  - Notes: Directly supports user search with optional limit and offset.

#### c. **Get User Followers**

- **Custom Implementation:**
  - Function: `getUserFollowers(userId: string, limit: number)`
  - Description: Retrieves a list of users who follow a specific user.

- **SDK Equivalent:**
  - Method: `audiusSdk.users.getUserFollowers({ userId, limit })`
  - Import Path: `audiusSdk.users.getUserFollowers`
  - Notes: Supports fetching followers with parameters for limit and offset.

#### d. **Get User Following**

- **Custom Implementation:**
  - Function: `getUserFollowing(userId: string, limit: number)`
  - Description: Retrieves a list of users that a specific user is following.

- **SDK Equivalent:**
  - Method: `audiusSdk.users.getUserFollowees({ userId, limit })`
  - Import Path: `audiusSdk.users.getUserFollowees`
  - Notes: Method name may differ (e.g., `getUserFollowees` vs. `getUserFollowing`); verify correct method in SDK documentation.

### 3. **Playlists**

#### a. **Get Playlist by ID**

- **Custom Implementation:**
  - Function: `getPlaylistById(playlistId: string)`
  - Description: Fetches a playlist's details by its ID.

- **SDK Equivalent:**
  - Method: `audiusSdk.playlists.getPlaylist({ playlistId })`
  - Import Path: `audiusSdk.playlists.getPlaylist`
  - Notes: Supports fetching playlist details by ID.

#### b. **Search Playlists**

- **Custom Implementation:**
  - Function: `searchPlaylists(query: string, limit: number)`
  - Description: Searches for playlists based on a query string.

- **SDK Equivalent:**
  - Method: `audiusSdk.playlists.searchPlaylists({ query, limit })`
  - Import Path: `audiusSdk.playlists.searchPlaylists`
  - Notes: Directly supports playlist search with optional limit and offset.

### 4. **Genres**

#### **Search Genres** (Custom Implementation)

- **Custom Implementation:**
  - Function: `searchGenres(query: string, limit: number)`
  - Description: Searches for genres matching a query. Since the Audius API doesn't provide a direct endpoint for genres, this is likely a custom solution.

- **SDK Equivalent:**
  - **No Direct SDK Method:**
    - The SDK does not provide a method to search genres directly, as the API doesn't support it.
  - **Alternative Approach:**
    - Fetch trending tracks or all tracks and extract genres.
    - Use `audiusSdk.tracks.getTrendingTracks()` or `audiusSdk.tracks.searchTracks()` and process the `genre` field.
  - **Notes:**
    - Additional custom logic will be required to replicate the genre search functionality.
    - Consider maintaining this custom implementation if necessary.

### 5. **Additional Functionalities**

#### a. **Calculate Genre Popularity**

- **Custom Implementation:**
  - Function: `calculateGenrePopularity(tracks: TrackData[], totalPoints: number)`
  - Description: Calculates genre popularity based on track data.

- **SDK Equivalent:**
  - **No SDK Method:**
    - The SDK does not provide a method for calculating genre popularity.
  - **Notes:**
    - This functionality is inherently custom and relies on application-specific logic.
    - The SDK can provide the necessary data (e.g., tracks with genres), but the calculation remains a custom implementation.

#### b. **Process and Format API Responses**

- **Custom Implementation:**
  - Functions in `process_api_response.ts` and `formatResults.ts` for formatting responses.

- **SDK Equivalent:**
  - **No SDK Method:**
    - The SDK provides raw data but does not format responses for display.

- **Notes:**
  - Response formatting is application-specific.
  - Utility functions for formatting can be retained or adjusted to work with SDK data structures.

---

## Summary of Mappings

| Custom Function                               | SDK Equivalent Method                               | Requires Custom Logic |
|-----------------------------------------------|-----------------------------------------------------|-----------------------|
| `getTrackById(trackId: string)`               | `audiusSdk.tracks.getTrack({ trackId })`            | No                    |
| `searchTracks(query: string, limit: number)`  | `audiusSdk.tracks.searchTracks({ query, limit })`   | No                    |
| `getTrendingTracks(limit: number)`            | `audiusSdk.tracks.getTrendingTracks({ limit })`     | No                    |
| `getTrackPlayCount(trackId: string)`          | `audiusSdk.tracks.getTrack({ trackId })`            | Access `playCount`    |
| `getUserById(userId: string)`                 | `audiusSdk.users.getUser({ userId })`               | No                    |
| `searchUsers(query: string, limit: number)`   | `audiusSdk.users.searchUsers({ query, limit })`     | No                    |
| `getUserFollowers(userId: string, limit: number)` | `audiusSdk.users.getUserFollowers({ userId, limit })` | No                 |
| `getUserFollowing(userId: string, limit: number)` | `audiusSdk.users.getUserFollowees({ userId, limit })` | Verify Method Name |
| `getPlaylistById(playlistId: string)`         | `audiusSdk.playlists.getPlaylist({ playlistId })`   | No                    |
| `searchPlaylists(query: string, limit: number)` | `audiusSdk.playlists.searchPlaylists({ query, limit })` | No               |
| `searchGenres(query: string, limit: number)`  | **No Direct Method**                                | Yes                   |
| `calculateGenrePopularity(tracks, totalPoints)` | **No SDK Method**                                  | Yes                   |
| **Response Formatting Functions**             | **No SDK Method**                                   | Yes                   |

---

## Action Items

1. **Implement Direct Mappings:**

   - Update API calls in the codebase to use the SDK methods listed above.
   - Replace manual HTTP requests with SDK methods.
   - Adjust parameters to match SDK method signatures if necessary.

2. **Review Custom Functionalities:**

   - For `searchGenres`, consider keeping the custom implementation or exploring alternative approaches using the SDK's capabilities.
   - For `calculateGenrePopularity`, retain the custom calculation logic but ensure it works with data structures returned by the SDK.

3. **Adjust Utility Functions:**

   - Update response formatting utilities to work with the data structures returned by the SDK.
   - Verify that property names and data formats align with the SDK's outputs.

4. **Verify Method Names and Availability:**

   - Confirm that all SDK methods are available and correctly named (e.g., `getUserFollowees` vs. `getUserFollowing`).
   - Consult the SDK documentation to ensure accurate implementation.

5. **Update Error Handling:**

   - Review how the SDK handles errors.
   - Adjust error handling in your application to be consistent with the SDK's patterns.

6. **Test All Functionalities:**

   - Thoroughly test each replaced API call to ensure functionality remains consistent.
   - Pay attention to edge cases and error scenarios.

7. **Update Documentation:**

   - Document any changes in function usage and any deviations from previous implementations.
   - Update inline comments and any developer guides.

---

## Notes

- **SDK Documentation Reference:**

  - Ensure you have access to the latest Audius SDK documentation.
  - This will aid in understanding method signatures, parameters, and return types.

- **Potential SDK Limitations:**

  - If any required functionality is not supported by the SDK, consider reaching out to the Audius team or implementing minimal custom solutions as needed.

---

## Conclusion

By mapping your custom API implementations to the equivalent SDK methods, we've established a clear plan for refactoring the codebase. The use of the Audius SDK will simplify your code, reduce duplication, and improve maintainability. Proceed with updating the codebase according to the action items listed above.

---
