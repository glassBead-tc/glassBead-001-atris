import fs from "fs";
import path from "path";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;

    if (!categories || categories.length === 0) {
        return { apis: [], error: "No categories provided" };
    }

    try {
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
        
        const categorySet = new Set(categories);
        const highLevelCategories = new Set(
            Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                .filter(([_, low]) => low.some(cat => categorySet.has(cat)))
                .map(([high, _]) => high.toLowerCase())
        );

        const apis = allData.endpoints
            .filter(api => highLevelCategories.has(api.category_name.toLowerCase()));

        return { apis };
    } catch (error) {
        console.error("Error in getApis:", error);
        return { apis: [], error: "Failed to fetch APIs" };
    }
};