import fs from "fs";
import { DatasetSchema, GraphState } from "../../types.js";
import { TRIMMED_CORPUS_PATH } from "../../constants.js";
import { logger } from '../../logger.js';

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    let { categories } = state;
    logger.debug(`getApis function called with categories: ${JSON.stringify(categories)}`);

    // Remove duplicates from categories
    categories = [...new Set(categories)] as [string, ...string[]];
    logger.debug(`Unique categories: ${JSON.stringify(categories)}`);

    try {
        logger.debug(`Reading data from TRIMMED_CORPUS_PATH: ${TRIMMED_CORPUS_PATH}`);
        const allData: { endpoints: DatasetSchema[] } = JSON.parse(await fs.promises.readFile(TRIMMED_CORPUS_PATH, "utf-8"));
        logger.debug(`Data read successfully. Total endpoints: ${allData.endpoints.length}`);
        
        let apis: DatasetSchema[];

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            logger.warn("No categories provided, returning all APIs");
            apis = allData.endpoints as DatasetSchema[];
        } else {
            const categorySet = new Set(categories.map((cat: string) => cat.toLowerCase()));
            apis = allData.endpoints.filter(api => {
                const apiCategories = api.category_name.split(',').map((cat: string) => cat.trim().toLowerCase());
                return apiCategories.some((cat: string) => categorySet.has(cat));
            });
        }

        logger.info(`Found ${apis.length} APIs matching the categories: ${categories.join(', ')}`);
        logger.debug(`APIs found: ${JSON.stringify(apis)}`);

        if (apis.length === 0) {
            logger.warn("No APIs found matching the given categories");
            return {
                apis: [],
                error: true,
                message: "No APIs were found matching the given categories."
            };
        }

        return { 
            apis,
            message: `Found ${apis.length} APIs matching the categories: ${categories.join(', ')}.`
        };
    } catch (error) {
        logger.error("Error in getApis:", error);
        return { 
            apis: [], 
            error: true,
            message: "An error occurred while fetching APIs."
        };
    }
};
