export function extractPlaylistId(query) {
    const matches = query.match(/playlist_id:\s*(\S+)/);
    return matches ? matches[1] : "";
}
