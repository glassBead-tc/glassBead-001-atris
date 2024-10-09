import fs from "fs";
import path from "path";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;
    console.log("Input categories:", categories);

    if (!categories || categories.length === 0) {
        console.log("No categories provided");
        return { apis: [] };
    }

    try {
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
        console.log("Loaded data endpoints count:", allData.endpoints.length);
        
        const categorySet = new Set(categories);
        console.log("Category set:", Array.from(categorySet));

        const highLevelCategories = new Set(
            Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                .filter(([_, low]) => low.some(cat => categorySet.has(cat)))
                .map(([high, _]) => high.toLowerCase())
        );
        console.log("High level categories:", Array.from(highLevelCategories));

        const apis = allData.endpoints
            .filter(api => highLevelCategories.has(api.category_name.toLowerCase()));
        console.log("Filtered APIs count:", apis.length);
        console.log("Filtered APIs:", apis.map(api => api.api_name));

        return { apis };
    } catch (error) {
        console.error("Error in getApis:", error);
        return { apis: [], error: "Failed to fetch APIs" };
    }
};