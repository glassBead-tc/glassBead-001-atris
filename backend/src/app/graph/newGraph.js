// import { StateGraph, CompiledStateGraph, END, START } from "@langchain/langgraph";
// import { GraphState, StateDefinition } from "../types.js"; // Ensure StateDefinition is imported
// import { ChatOpenAI } from '@langchain/openai';
// import { CategorizeQueryToolNode } from '../tools/CategorizeQueryTool.js';
// import { extractParameters } from '../tools/ExtractParametersTool.js';
// // Import additional ToolNodes as necessary
export {};
// export function createNewGraph(): CompiledStateGraph<GraphState, Partial<GraphState>, typeof START, StateDefinition, StateDefinition, StateDefinition> {
//   // Initialize the language model
//   const llm = new ChatOpenAI({
//     modelName: 'gpt-4',
//     temperature: 0,
//     openAIApiKey: process.env.OPENAI_API_KEY,
//   });
//   // Initialize the StateGraph with channels
//   const graph = new StateGraph<GraphState, Partial<GraphState>, typeof START, StateDefinition, StateDefinition, StateDefinition>({
//     channels: {
//       llm: () => llm,
//       // Define other channels if needed
//     },
//   });
//   // Add ToolNodes to the graph
//   graph.addNode("categorize_query", CategorizeQueryToolNode);
//   graph.addNode("extract_parameters", extractParameters);
//   // Add other ToolNodes similarly
//   // Define the workflow edges
//   graph.addEdge(START, "categorize_query");
//   graph.addEdge("categorize_query", "extract_parameters");
//   // Add additional edges based on your desired workflow
//   graph.addEdge("extract_parameters", END);
//   // Compile and return the graph
//   return graph.compile();
// }
