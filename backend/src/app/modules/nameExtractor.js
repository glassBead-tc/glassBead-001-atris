export function extractUserName(query) {
    const lowercaseQuery = query.toLowerCase();
    const keywords = ['followers', 'following', 'artist', 'user'];
    // Remove known keywords from the query
    let cleanedQuery = lowercaseQuery;
    keywords.forEach(keyword => {
        cleanedQuery = cleanedQuery.replace(keyword, '');
    });
    // Split the remaining query into words
    const words = cleanedQuery.split(/\s+/).filter(word => word.length > 0);
    // If we have more than one word, join them back together
    // This assumes the artist name is at the end of the query
    if (words.length > 1) {
        return words.slice(-2).join(' ').trim();
    }
    else if (words.length === 1) {
        return words[0].trim();
    }
    // If we couldn't extract a name, return the original query
    return query.trim();
}
