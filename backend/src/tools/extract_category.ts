import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState, DatasetSchema } from "../types.js";
import { ExtractHighLevelCategories } from "./extract_high_level_categories.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export async function extractCategory(state: GraphState): Promise<Partial<GraphState>> {
  const { llm, query } = state;

  if (!llm) {
    return { error: "LLM is not initialized in the GraphState" };
  }

  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert software engineer. Currently, you are helping a fellow engineer select the best category of APIs based on their query. Here are all the high level categories, and every tool name that falls under them: {categoriesAndTools}`],
      ["human", `Query: {query}`],
    ]);

    const tool = new ExtractHighLevelCategories();
    const modelWithTools = llm.withStructuredOutput(tool);
    const chain = prompt.pipe(modelWithTools).pipe(tool);

    const allApisData = await import('fs').then(fs => fs.promises.readFile(TRIMMED_CORPUS_PATH, "utf-8")).then(JSON.parse);
    const allApis: DatasetSchema[] = allApisData.endpoints;
    const categoriesAndTools = Object.entries(HIGH_LEVEL_CATEGORY_MAPPING).map(([high]) => {
      const allTools = allApis.filter((api: DatasetSchema) => api.category_name.toLowerCase() === high.toLowerCase());
      return `High Level Category: ${high}\nTools:\n${allTools.map(item => `Name: ${item.tool_name}`).join("\n")}`;
    }).join("\n\n");

    const result = await chain.invoke({ query, categoriesAndTools });
    const categories = JSON.parse(result);

    return { categories };
  } catch (error) {
    console.error("Error in extractCategory:", error);
    return { error: "Failed to extract categories" };
  }
}