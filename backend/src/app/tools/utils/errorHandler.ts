export class AudiusApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AudiusApiError';
  }
}

export function handleApiError(error: any) {
  if (error instanceof AudiusApiError) {
    console.error(`Audius API Error (${error.statusCode}): ${error.message}`);
    // Handle specific error codes
  } else {
    console.error('Unexpected error:', error);
  }
  // Implement retry logic or other error handling strategies
}
