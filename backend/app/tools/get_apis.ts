import fs from "fs";
import path from "path";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;
    console.log("getApis function called with categories:", categories);

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        console.log("No valid categories provided");
        return { apis: [], error: "No valid categories provided" };
    }

    try {
        console.log("Reading data from TRIMMED_CORPUS_PATH");
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
        console.log("Data read successfully");
        
        const categorySet = new Set(categories.map(cat => cat.toLowerCase()));
        console.log("Category set:", categorySet);

        console.log("HIGH_LEVEL_CATEGORY_MAPPING:", HIGH_LEVEL_CATEGORY_MAPPING);
        const highLevelCategories = new Set(
            Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                .filter(([high, _]) => categorySet.has(high.toLowerCase()))
                .map(([high, _]) => high.toLowerCase())
        );
        console.log("High level categories:", highLevelCategories);

        const apis = allData.endpoints
            .filter(api => highLevelCategories.has(api.category_name.toLowerCase()));

        console.log("Input categories:", categories);
        console.log("Selected APIs:", apis.map(api => api.api_name));

        return { apis };
    } catch (error) {
        console.error("Error in getApis:", error);
        return { apis: [], error: "Failed to fetch APIs" };
    }
};