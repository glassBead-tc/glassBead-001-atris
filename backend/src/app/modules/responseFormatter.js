export function formatUserResponse(userDetails, originalQuery) {
    if (userDetails && userDetails.data) {
        const { name, handle, follower_count, following_count, track_count } = userDetails.data;
        if (originalQuery.toLowerCase().includes('followers')) {
            return `${name} (@${handle}) has ${follower_count} followers on Audius.`;
        }
        else if (originalQuery.toLowerCase().includes('following')) {
            return `${name} (@${handle}) is following ${following_count} users on Audius.`;
        }
        else {
            return `User: ${name} (@${handle})
Followers: ${follower_count}
Following: ${following_count}
Tracks: ${track_count !== undefined ? track_count : 'Unknown'}`;
        }
    }
    return "I couldn't format the user details. This is likely a bug.";
}
