import * as readline from 'readline';
import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { handleQuery } from './modules/queryHandler.js';
import { logger } from './logger.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { isUserQuery } from './tools/extract_parameters.js';
import { QueryType } from './types.js';
import { classifyQuery } from './modules/queryClassifier.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runInteractiveTest() {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    console.error('OPENAI_API_KEY is not defined in the environment variables.');
    process.exit(1);
  }

  const llm = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0,
    openAIApiKey: openAiApiKey,
  });

  console.log("Creating graph...");
  const graph = createGraph();
  console.log("Graph created. Ready for queries!");

  async function askQuestion() {
    rl.question('Enter your query (or type "exit" to quit): ', async (query) => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      try {
        console.log(`Processing query: ${query}`);
        const queryType = classifyQuery(query);
        const isUser = isUserQuery(query);
        const result = await handleQuery(graph, llm, query );
        console.log(`Response: ${result.response}`);
        if (result.error) {
          console.log(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Error processing query:', error);
      }

      askQuestion();
    });
  }

  askQuestion();
}

runInteractiveTest().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
