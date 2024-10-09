import fs from "fs";
import path from "path";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log("getApis function called with state.");
    const { categories } = state;
    console.log("Input categories count:", categories!.length);

    if (!categories || categories.length === 0) {
        console.log("No categories provided, returning empty APIs array");
        return { apis: [] };
    }

    try {
        console.log("Attempting to read file from:", TRIMMED_CORPUS_PATH);
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
        console.log("Successfully loaded data. Total endpoints count:", allData.endpoints.length);
        
        const categorySet = new Set(categories);
        console.log("Category set:", Array.from(categorySet));

        console.log("HIGH_LEVEL_CATEGORY_MAPPING:", HIGH_LEVEL_CATEGORY_MAPPING);
        console.log("TRIMMED_CORPUS_PATH:", TRIMMED_CORPUS_PATH);
        const highLevelCategories = new Set(
            Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                .filter(([_, low]) => low.some(cat => categorySet.has(cat)))
                .map(([high, _]) => high.toLowerCase())
        );
        console.log("Derived high level categories:", Array.from(highLevelCategories));

        const apis = allData.endpoints
            .filter(api => highLevelCategories.has(api.category_name.toLowerCase()));
        console.log("Filtered APIs count:", apis.length);
        if (apis.length > 0) {
            console.log("Filtered APIs found.");
        } else {
            console.log("No APIs matched the given categories.");
        }

        return { apis };
    } catch (error) {
        console.error("Error in getApis:", error);
        console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
        return { apis: [], error: "Failed to fetch APIs" };
    }
};