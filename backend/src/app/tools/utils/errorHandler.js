export class AudiusApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AudiusApiError';
    }
}
export function handleApiError(error) {
    if (error instanceof AudiusApiError) {
        console.error(`Audius API Error (${error.statusCode}): ${error.message}`);
        // Handle specific error codes
    }
    else {
        console.error('Unexpected error:', error);
    }
    // Implement retry logic or other error handling strategies
}
