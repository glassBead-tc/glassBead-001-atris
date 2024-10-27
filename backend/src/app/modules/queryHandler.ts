// import { ChatOpenAI } from "@langchain/openai";
// import { CompiledStateGraph } from "@langchain/langgraph";
// import { GraphState, QueryClassification } from "../types.js";
// import { logger } from '../logger.js';
// import { ClassifyQueryTool } from '../tools/CategorizeQueryTool.js';

// interface QueryResult {
//   response: string;
//   error?: string;
// }

// export async function handleQuery(
//   graph: CompiledStateGraph<GraphState, Partial<GraphState>, string>,
//   llm: ChatOpenAI,
//   query: string
// ): Promise<QueryResult> {
//   logger.info(`Handling query: ${query}`);

//   // Use the ClassifyQueryTool instead of classifyQuery function
//   const classifyQueryTool = new ClassifyQueryTool();
//   const classification = await classifyQueryTool.call({ query });
//   logger.info(`Query classification: ${JSON.stringify(classification)}`);

//   logger.info(`Query type: ${classification.type}, Is entity query: ${classification.isEntityQuery}, Entity type: ${classification.entityType}, Entity: ${classification.entity}, Complexity: ${classification.complexity}`);

//   try {
//     logger.info(`Invoking graph for query (${classification.type}, Complexity: ${classification.complexity})`);
    
//     // Adjust graph invocation based on complexity
//     let result;
//     switch (classification.complexity) {
//       case 'simple':
//         result = await graph.invoke({
//           llm,
//           query,
//           queryType: classification.type,
//           isEntityQuery: classification.isEntityQuery,
//           entityType: classification.entityType,
//           entity: classification.entity
//         });
//         break;
//       case 'moderate':
//         result = await graph.invoke({
//           llm,
//           query,
//           queryType: classification.type,
//           isEntityQuery: classification.isEntityQuery,
//           entityType: classification.entityType,
//           entity: classification.entity
//         });
//         break;
//       case 'complex':
//         // Future implementation for complex queries
//         logger.warn("Complex query handling not yet implemented.");
//         return { 
//           response: "This query is too complex to handle at the moment. Please try a different question.",
//           error: "Complex query handling not implemented."
//         };
//       default:
//         logger.warn("Unknown complexity level. Treating as simple query.");
//         result = await graph.invoke({
//           llm,
//           query,
//           queryType: classification.type,
//           isEntityQuery: classification.isEntityQuery,
//           entityType: classification.entityType,
//           entity: classification.entity
//         });
//     }

//     logger.info("Graph invocation completed");

//     if (result.formattedResponse) {
//       logger.info(`Formatted response received: ${result.formattedResponse}`);
//       return { response: result.formattedResponse };
//     } else if (result.error) {
//       logger.warn(`Error in graph invocation: ${result.error}`);
//       return { 
//         response: "I'm sorry, but I encountered an error while processing your query. Could you please try again?",
//         error: result.error
//       };
//     } else {
//       logger.warn(`No formatted response or error for query: ${query}`);
//       return { 
//         response: "I'm sorry, but I couldn't find a clear answer to your question. Could you please rephrase it?",
//         error: "No formatted response"
//       };
//     }
//   } catch (error: unknown) {
//     logger.error(`Unexpected error processing query "${query}":`, error);
//     return { 
//       response: "I encountered an unexpected error while processing your query. Please try again later or contact support if the issue persists.",
//       error: error instanceof Error ? error.message : String(error)
//     };
//   }

//   logger.info("Main execution completed");
// }
