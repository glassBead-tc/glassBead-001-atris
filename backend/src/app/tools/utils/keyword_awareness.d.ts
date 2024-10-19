import { DatasetSchema } from '../../types.js';
export declare class KeywordAwareness {
    private apis;
    constructor(apis: DatasetSchema[]);
    private keywordApiMapping;
    private keywordWeights;
    private keywordPatterns;
    calculateApiRelevance(api: DatasetSchema, query: string): number;
    updateKeywordWeight(keyword: string, weight: number): void;
    addKeywordPattern(pattern: RegExp, apis: string[], weight: number): void;
}
export declare function selectApi(apis: DatasetSchema[], query: string): DatasetSchema | null;
