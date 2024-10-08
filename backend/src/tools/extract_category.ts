import fs from "fs";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState } from "../types.js";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "constants.js";
import { DatasetSchema } from "types.js";

/**
 * Given a users query, extract the high level category which
 * best represents the query.
 *
 * TODO: add schema, name, description, and _call method
 */
export class ExtractHighLevelCategories extends StructuredTool {
  schema = z.object({
    highLevelCategories: z
      .array(
        z
          .enum(
            Object.keys(HIGH_LEVEL_CATEGORY_MAPPING) as [string, ...string[]]
          )
          .describe("An enum of all categories which best match the query.")
      )
      .describe("The high level categories to extract from the query."),
  });

  name = "ExtractHighLevelCategories";

  description =
    "Given a user query, extract the high level category which best represents the query.";

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const categoriesMapped = input.highLevelCategories
      .map(
        (category) =>
          HIGH_LEVEL_CATEGORY_MAPPING[
            category as keyof typeof HIGH_LEVEL_CATEGORY_MAPPING
          ]
      )
      .flat();
    return JSON.stringify(categoriesMapped);
  }
}

/**
 * @param {GraphState} state
 */
export async function extractCategory(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { llm, query } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer.

Currently, you are helping a fellow engineer select the best category of APIs based on their query.
You are only presented with a list of high level API categories, and their query.
Think slowly, and carefully select the best category for the query.
Here are all the high level categories, and every tool name that falls under them:
{categoriesAndTools}`,
    ],
    ["human", `Query: {query}`],
  ]);

  const tool = new ExtractHighLevelCategories();
  const modelWithTools = llm.withStructuredOutput(tool);
  const chain = prompt.pipe(modelWithTools).pipe(tool);

  const allApisData: { endpoints: DatasetSchema[] } = JSON.parse(
    fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8")
  );
  
  if (!allApisData || !Array.isArray(allApisData.endpoints)) {
    throw new Error("Expected an object with an 'endpoints' array");
  }

  const allApis: DatasetSchema[] = allApisData.endpoints;

  const categoriesAndTools = Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
    .map(([high]) => {
      const allTools = allApis.filter((api) => 
        api.category_name.toLowerCase() === high.toLowerCase()
      );
      return `High Level Category: ${high}\nTools:\n${allTools
        .map((item) => `Name: ${item.tool_name}`)
        .join("\n")}`;
    })
    .join("\n\n");

  // Format the prompt with the necessary input
  const formattedPrompt = await prompt.format({
    categoriesAndTools,
    query
  });

  // Use the chain instead of directly invoking the LLM
  const result = await chain.invoke({
    query,
    categoriesAndTools
  });

  // The result should already be an array of categories
  const categories = JSON.parse(result);

  // Return the categories as part of the state update
  return {
    categories: categories,
    // Make sure to include any other state properties that this function might modify
  };
}

function parseCategories(content: string): string[] {
  // Remove any leading/trailing whitespace
  content = content.trim();

  // Check if the content is wrapped in brackets or quotes
  const unwrappedContent = content.replace(/^[\[\("']|[\]\)"']$/g, '');

  // Split the content by commas, semicolons, or newlines
  const rawCategories = unwrappedContent.split(/[,;\n]+/);

  // Process each category
  const categories = rawCategories
    .map(category => {
      // Remove leading/trailing whitespace and quotes
      category = category.trim().replace(/^["']|["']$/g, '');
      
      // Remove any numbering or bullet points
      category = category.replace(/^\d+\.|\-|\*/, '').trim();

      // Convert to title case (capitalize first letter of each word)
      return category.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    })
    .filter(category => category.length > 0); // Remove any empty categories

  // Remove duplicates
  return Array.from(new Set(categories));
}
