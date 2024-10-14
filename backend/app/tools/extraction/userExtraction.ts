export function extractUserId(query: string): string {
  const matches = query.match(/user(?:\s+id)?\s+(\w+)/i);
  return matches ? matches[1] : "";
}

export function extractWalletAddress(query: string): string {
  const matches = query.match(/wallet\s+address\s+([\da-fA-F]{40})/i);
  return matches ? matches[1] : "";
}

// Add other user-related extraction functions...
