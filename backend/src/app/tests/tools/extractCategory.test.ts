import { test, expect } from 'vitest';
import { extractCategoryTool } from '../../tools/tools.js';
import { ChatOpenAI, type ChatOpenAICallOptions } from "@langchain/openai";

test('extractCategoryTool input validation', async () => {
  const llm = new ChatOpenAI<ChatOpenAICallOptions>({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.1,
  });

  // Test valid input
  const validInput = {
    query: "What are the top trending tracks?",
    llm
  };

  // This should not throw
  await expect(extractCategoryTool.invoke(validInput))
    .resolves.toBeDefined();

  // Test invalid input
  const invalidInput = {
    query: "What are the top trending tracks?",
    // Missing llm
  };

  // This should throw with specific error
  await expect(extractCategoryTool.invoke(invalidInput))
    .rejects.toThrow('Received tool input did not match expected schema');
}); 