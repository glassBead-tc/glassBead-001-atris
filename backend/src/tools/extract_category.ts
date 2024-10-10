import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState, DatasetSchema } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

export class ExtractHighLevelCategories extends StructuredTool {
  schema = z.object({
    highLevelCategories: z.array(z.enum(Object.keys(HIGH_LEVEL_CATEGORY_MAPPING) as [string, ...string[]]))
      .describe("The high level categories to extract from the query."),
  });

  name = "ExtractHighLevelCategories";

  description = "Given a user query, extract the high level category which best represents the query.";

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const categoriesMapped = input.highLevelCategories.map(category => HIGH_LEVEL_CATEGORY_MAPPING[category as keyof typeof HIGH_LEVEL_CATEGORY_MAPPING]).flat();
    return JSON.stringify(categoriesMapped);
  }
}

/**
 * @param {GraphState} state
 */
export async function extractCategory(
  state: GraphState
): Promise<Partial<GraphState>> {
  console.log("Current state:", state);
  const { llm, query } = state;

  if (!llm) {
    return { error: "LLM is not initialized in the GraphState" };
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert software engineer. Currently, you are helping a fellow engineer select the best category of APIs based on their query. Here are all the high level categories, and every tool name that falls under them: {categoriesAndTools}`],
    ["human", `Query: {query}`],
  ]);

  const tool = new ExtractHighLevelCategories();

  if (typeof llm.withStructuredOutput === 'function') {
    const modelWithTools = llm.withStructuredOutput(tool);
    const chain = prompt.pipe(modelWithTools).pipe(tool);

    const allApisData = await import('fs').then(fs => fs.promises.readFile(TRIMMED_CORPUS_PATH, "utf-8")).then(JSON.parse);
    if (!allApisData || !Array.isArray(allApisData.endpoints)) {
      throw new Error("Expected an object with an 'endpoints' array");
    }

    const allApis: DatasetSchema[] = allApisData.endpoints;
    const categoriesAndTools = Object.entries(HIGH_LEVEL_CATEGORY_MAPPING).map(([high]) => {
      const allTools = allApis.filter(api => api.category_name.toLowerCase() === high.toLowerCase());
      return `High Level Category: ${high}\nTools:\n${allTools.map(item => `Name: ${item.tool_name}`).join("\n")}`;
    }).join("\n\n");

    const formattedPrompt = await prompt.format({ categoriesAndTools, query });
    const result = await chain.invoke({ query, categoriesAndTools });
    const categories = parseCategories(result);

    return { categories };
  } else {
    return { error: "LLM is not properly initialized or doesn't have the expected methods" };
  }
}

function parseCategories(content: string): string[] {
  return content.trim().split(/[,;\n]+/).map(category => category.trim()).filter(category => category.length > 0);
}