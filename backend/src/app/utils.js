export const findMissingParams = (requiredParams, extractedParams) => {
    const missing = requiredParams.filter((required) => !extractedParams.some((extracted) => extracted === required));
    return missing;
};
