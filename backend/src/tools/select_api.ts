import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema, GraphState } from "../types.js";
import * as readline from "readline";
import { findMissingParams } from "utils.js";
import { readUserInput } from "./request_parameters.js";
import { parseUserInput } from "./request_parameters.js";

// Change the template format to use backticks and simple placeholders
const apiSelectionPrompt = ChatPromptTemplate.fromTemplate(`
  Given the following query: {{query}}
  
  Please select the most appropriate API from the following list:
  {{apis}}
  
  Provide your response in the following JSON format:
  {
    "api": "API Name",
    "parameters": {
      "param1": "default_value",
      "param2": "default_value"
    },
    "description": "Brief description of what the API does"
  }
  
  Only include parameters that are relevant to the query.
`, { templateFormat: "mustache" }); // DO NOT CHANGE FROM MUSTACHE: This is a workaround for a bug in LangChain that took 3 days
                                    // and as many AI assistants to figure out. I was never able to visually see what was happening,
                                    // but at the moment the prompt was getting parsed, it gave an error about there being an extra right curly brace
                                    // somewhere and failed.

function calculateRelevance(api: DatasetSchema, query: string): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerApiName = api.api_name.toLowerCase();

  if (lowerQuery.includes(lowerApiName)) score += 10;
  if (lowerQuery.includes(api.category_name.toLowerCase())) score += 5;

  // Add more conditions based on your specific requirements

  return score;
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { query, apis, llm } = state;

  if (!apis || apis.length === 0) {
    console.error("No APIs available for selection.");
    return { error: "No APIs available for selection" };
  }

  if (!llm) {
    console.error("Language model (llm) is not initialized.");
    return { error: "Language model is not initialized" };
  }

  if (!query) {
    console.error("Query is null or undefined.");
    return { error: "Query is null or undefined" };
  }

  // Calculate relevance scores
  const scoredApis = apis.map(api => ({
    ...api,
    relevanceScore: calculateRelevance(api, query)
  }));

  // Sort APIs by relevance score
  scoredApis.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Take top 5 most relevant APIs
  const topApis = scoredApis.slice(0, 5);

  const chain = RunnableSequence.from([
    apiSelectionPrompt,
    llm,
    new StringOutputParser(),
    (output: string) => {
      try {
        return JSON.parse(output);
      } catch (error) {
        console.error("Error parsing LLM output:", error);
        throw new Error("Invalid LLM output format");
      }
    },
  ]);

  try {
    const apiList = topApis.map(api => `${api.api_name}: ${api.api_description}`).join("\n");

    const result = await chain.invoke({
      query,
      apis: apiList,
    });

    if (!isValidApiOutput(result)) {
      throw new Error("Invalid API output format");
    }

    // Human-in-the-loop: Ask for user confirmation
    const userConfirmation = await getUserConfirmation(result.api);
    if (!userConfirmation) {
      // Allow user to select a different API
      const userSelectedApi = await getUserSelectedApi(topApis);
      if (!userSelectedApi) {
        throw new Error("No API selected by the user.");
      }
      return {
        bestApi: {
          ...userSelectedApi,
          parameters: result.parameters,
        },
        query,
      };
    }

    const selectedApi = apis.find(api => api.api_name === result.api);
    if (!selectedApi) {
      throw new Error(`Selected API '${result.api}' not found in available APIs`);
    }

    // Gather parameters if needed
    const extractedParams = Object.keys(result.parameters); // Ensure this is an array of strings

    const missingParams = findMissingParams(
      selectedApi.required_parameters.map(param => param.name),
      extractedParams
    );
    if (missingParams.length > 0) {
      const userInput = await readUserInput(missingParams);
      const parsedParams = parseUserInput(userInput);
      const parameters = {
        ...(typeof result.parameters === 'object' ? result.parameters : {}),
        ...(typeof parsedParams === 'object' ? parsedParams : {}),
      };

      console.log("Result Parameters:", result.parameters);

      return {
        bestApi: {
          ...selectedApi,
          parameters,
        },
        query,
      };
    }

    return {
      bestApi: {
        ...selectedApi,
        parameters: result.parameters,
      },
      query,
    };
  } catch (error) {
    console.error("Error selecting API:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

// Function to get user confirmation
async function getUserConfirmation(apiName: string): Promise<boolean> {
  const response = await promptUser(`Do you want to proceed with the API: ${apiName}? (yes/no)`);
  return response.toLowerCase() === 'yes';
}

// Function to get user-selected API
async function getUserSelectedApi(topApis: DatasetSchema[]): Promise<DatasetSchema | null> {
  const apiNames = topApis.map(api => api.api_name).join(", ");
  const response = await promptUser(`Please select an API from the following options: ${apiNames}`);
  return topApis.find(api => api.api_name === response) || null;
}

// Function to prompt user input using readline
async function promptUser(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function isValidApiOutput(output: any): output is { api: string; parameters: Record<string, any>; description: string } {
  return (
    output &&
    typeof output.api === 'string' &&
    typeof output.parameters === 'object' &&
    typeof output.description === 'string'
  );
}