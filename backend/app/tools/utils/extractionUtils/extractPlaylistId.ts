import { logger } from "../../../logger.js";

export function extractPlaylistId(query: string): string {
  const matches = query.match(/playlist_id:\s*(\S+)/);
  return matches ? matches[1] : "";
}
