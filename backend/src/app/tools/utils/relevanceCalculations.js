import { apiConfig } from "../../audiusApiConfig.js";
export function calculateRelevance(query, apiEndpoint) {
    const api = apiConfig[apiEndpoint];
    if (!api)
        return 0;
    const queryWords = query.toLowerCase().split(/\s+/);
    const apiWords = apiEndpoint.toLowerCase().split(/[/{}]+/).filter(Boolean);
    const nameRelevance = calculateWordOverlap(queryWords, apiWords);
    const paramRelevance = calculateParamRelevance(queryWords, api);
    return (nameRelevance * 0.7) + (paramRelevance * 0.3);
}
function calculateWordOverlap(queryWords, apiWords) {
    const uniqueQueryWords = new Set(queryWords);
    const uniqueApiWords = new Set(apiWords);
    const intersection = new Set([...uniqueQueryWords].filter(x => uniqueApiWords.has(x)));
    const union = new Set([...uniqueQueryWords, ...uniqueApiWords]);
    return intersection.size / union.size;
}
function calculateParamRelevance(queryWords, api) {
    const allParams = [...api.required, ...api.optional];
    const paramWords = allParams.flatMap(param => param.toLowerCase().split('_'));
    return calculateWordOverlap(queryWords, paramWords);
}
