export function extractTime(query) {
    const matches = query.match(/time:\s*(\S+)/);
    return matches ? matches[1] : "";
}
