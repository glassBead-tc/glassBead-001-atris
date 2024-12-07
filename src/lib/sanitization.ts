/**
 * Sanitization utilities for chat and agent inputs
 */

/**
 * Sanitizes user input for chat interactions.
 * Focuses on readability and basic safety while preserving meaning.
 */
export function sanitizeChatInput(input: string): string {
  if (typeof input !== 'string') {
    console.warn('Non-string input received:', typeof input);
    return '';
  }

  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ');                         // Normalize whitespace
}

/**
 * Sanitizes input specifically for agent/API interactions.
 * Focuses on API safety and parameter cleanliness.
 */
export function sanitizeAgentInput(input: string): string {
  const chatSanitized = sanitizeChatInput(input);
  
  // Additional sanitization for agent inputs
  return chatSanitized
    .replace(/[^\x20-\x7E\s]/g, '')  // Keep only printable ASCII
    .replace(/["'`]/g, '')           // Remove quotes that could affect API calls
    .trim();
}

/**
 * Validates if a string needs sanitization
 */
export function needsSanitization(input: string): boolean {
  return input !== sanitizeChatInput(input);
}

/**
 * Logs sanitization actions if significant changes were made
 */
export function logSanitization(original: string, sanitized: string): void {
  if (original !== sanitized) {
    console.log('Input sanitized:', {
      original,
      sanitized,
      changes: original.length - sanitized.length
    });
  }
}
