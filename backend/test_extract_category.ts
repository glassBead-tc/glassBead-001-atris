import fs from "fs";
import { extractCategory } from './src/tools/extract_category.js';
import { GraphState } from './src/index.js';
import { ChatOpenAI } from "@langchain/openai";

const mockLLM = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0,
});

const testGraphState: GraphState = {
  llm: mockLLM,
  query: "What are the top trending tracks on Audius right now?",
  categories: null,
  apis: null,
  bestApi: null,
  params: null,
  response: null,
};

async function testExtractCategory() {
  console.log("Starting category extraction test...");
  try {
    const result = await extractCategory(testGraphState);
    console.log("Extracted Categories:", result.categories);
  } catch (error) {
    console.error("Error extracting categories:", error);
  }
  console.log("Category extraction test completed.");
}

testExtractCategory();
