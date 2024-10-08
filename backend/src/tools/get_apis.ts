import { DatasetSchema, GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { logger } from "../logger.js";
import fs from "fs";

export const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
    const { categories } = state;
    const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
    
    const apis = Array.from(new Set(allData.endpoints.filter((api) => 
      categories!.some((category) => 
        Object.entries(HIGH_LEVEL_CATEGORY_MAPPING).some(([high, low]) => 
          low.includes(category) && api.category_name.toLowerCase() === high.toLowerCase()
        )
      )
    ).map(api => api.api_name))).map(apiName => 
      allData.endpoints.find(api => api.api_name === apiName)!
    );
  
    logger.debug(`Found ${apis.length} unique APIs for categories: ${categories!.join(', ')}`);
    return { apis };
  };