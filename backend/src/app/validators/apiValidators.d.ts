export type ApiValidator = {
    validate: (response: any) => boolean;
    successMessage: (response: any) => string;
    failureMessage: string;
};
export declare const apiValidators: Record<string, ApiValidator>;
