import fs from "fs";
import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { logger } from '../logger.js';

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;
    logger.debug(`getApis function called with categories: ${JSON.stringify(categories)}`);

    try {
        logger.debug(`Reading data from TRIMMED_CORPUS_PATH: ${TRIMMED_CORPUS_PATH}`);
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(await fs.promises.readFile(TRIMMED_CORPUS_PATH, "utf-8"));
        logger.debug(`Data read successfully. Total endpoints: ${allData.endpoints.length}`);
        
        let apis: DatasetSchema[];

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            logger.warn("No categories provided, returning all APIs");
            apis = allData.endpoints;
        } else {
            const categorySet = new Set(categories.map(cat => cat.toLowerCase()));

            // Include both high-level and specific categories
            const relevantCategories = new Set([
                ...categorySet,
                ...Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
                    .filter(([high, low]) => categorySet.has(high.toLowerCase()))
                    .flatMap(([_, low]) => low.map(l => l.toLowerCase()))
            ]);

            logger.debug("Relevant categories:", Array.from(relevantCategories));

            apis = allData.endpoints.filter(api => 
                relevantCategories.has(api.category_name.toLowerCase())
            );
        }

        logger.info(`Found ${apis.length} APIs matching the categories: ${categories ? categories.join(', ') : 'All'}`);
        logger.debug(`APIs found: ${JSON.stringify(apis)}`);

        if (apis.length === 0) {
            logger.warn("No APIs found matching the given categories");
            return {
                apis: [],
                error: "No matching APIs found",
                message: "No APIs were found matching the given categories."
            };
        }

        return { 
            apis,
            message: `Found ${apis.length} APIs matching the categories: ${categories ? categories.join(', ') : 'All'}.`
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
