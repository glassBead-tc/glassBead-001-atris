export declare class AudiusApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare function handleApiError(error: any): void;
