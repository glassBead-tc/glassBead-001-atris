import fs from "fs";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { logger } from '../logger.js';

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;
    logger.debug("getApis function called with categories:", categories);

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        logger.warn("No valid categories provided");
        return { 
            apis: [], 
            error: "No valid categories provided",
            message: "Failed to fetch APIs: No valid categories provided."
        };
    }

    try {
        logger.debug("Reading data from TRIMMED_CORPUS_PATH");
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(await fs.promises.readFile(TRIMMED_CORPUS_PATH, "utf-8"));
        logger.debug("Data read successfully");
        
        const categorySet = new Set(categories.map(cat => cat.toLowerCase()));

        const highLevelCategories = new Set(
            Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                .filter(([high, _]) => categorySet.has(high.toLowerCase()))
                .map(([high, _]) => high.toLowerCase())
        );
        logger.debug("High level categories:", Array.from(highLevelCategories));

        const apis = allData.endpoints
            .filter(api => highLevelCategories.has(api.category_name.toLowerCase()));

        logger.info(`Found ${apis.length} APIs matching the categories: ${categories.join(', ')}`);

        return { 
            apis,
            message: `Found ${apis.length} APIs matching the categories: ${categories.join(', ')}.`
        };
    } catch (error) {
        logger.error("Error in getApis:", error);
        return { 
            apis: [], 
            error: "Failed to fetch APIs",
            message: "An error occurred while fetching APIs."
        };
    }
};
