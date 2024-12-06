import { apiLogger } from "../../../logger.js";
import { GraphState } from "../../../types.js";

export function extractTime(query: string): string {
  const matches = query.match(/time:\s*(\S+)/);
  return matches ? matches[1] : "";
}
