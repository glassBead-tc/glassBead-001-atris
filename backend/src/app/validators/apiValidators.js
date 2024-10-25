export const apiValidators = {
    "Get Trending Tracks": {
        validate: (response) => response && response.data && Array.isArray(response.data.data) && response.data.data.length > 0,
        successMessage: (response) => `Retrieved ${response.data.data.length} trending tracks`,
        failureMessage: "Failed to retrieve trending tracks or the response was empty",
    },
    "Search Tracks": {
        validate: (response) => response && response.data && Array.isArray(response.data.data) && response.data.data.length > 0,
        successMessage: (response) => `Found ${response.data.data.length} tracks matching the search query`,
        failureMessage: "No tracks found matching the search query or the response was empty",
    },
    "Get Track": {
        validate: (response) => response && response.data && response.data.id,
        successMessage: (response) => `Retrieved track with ID: ${response.data.id}`,
        failureMessage: "Failed to retrieve track information",
    },
    "Get User": {
        validate: (response) => response && response.data && response.data.id,
        successMessage: (response) => `Retrieved user information for user ID: ${response.data.id}`,
        failureMessage: "Failed to retrieve user information",
    },
    "Search Users": {
        validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
        successMessage: (response) => `Found ${response.data.length} users matching the search criteria`,
        failureMessage: "Failed to search for users or no results found",
    },
    "Get Playlist": {
        validate: (response) => response && response.data && response.data.id,
        successMessage: (response) => `Retrieved playlist with ID: ${response.data.id}`,
        failureMessage: "Failed to retrieve playlist information",
    },
    "Search Playlists": {
        validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
        successMessage: (response) => `Found ${response.data.length} playlists matching the search criteria`,
        failureMessage: "Failed to search for playlists or no results found",
    },
};
