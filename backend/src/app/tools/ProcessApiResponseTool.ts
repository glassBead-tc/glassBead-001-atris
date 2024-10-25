// import { StructuredTool } from "@langchain/core/tools";
// import { z } from "zod";
// import { GraphState } from "../index.js";
// import { logger } from '../logger.js';
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// const schema = z.object({
//   bestApi: z.any(),
//   response: z.any(),
//   error: z.boolean(),
//   errorMessage: z.string().nullable(),
// });

// export class ProcessApiResponseTool extends StructuredTool {
//   name = "process_api_response";
//   description = "Processes the response received from the API fetch request.";

//   schema = schema;

//   async _call({ ...state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
//     const { fetchResponse } = state.response;
//     const { bestApi } = state;
//     try {
//       if (!fetchResponse) {
//         throw new Error("No response received from the API.");
//       }

//       // Example processing logic based on API type
//       let processedData = {};
//       switch (bestApi.api_name) {
//         case 'TrackAPI':
//           processedData = this.processTrackResponse(fetchResponse);
//           break;
//         case 'UserAPI':
//           processedData = this.processUserResponse(fetchResponse);
//           break;
//         // Add more cases as needed
//         default:
//           processedData = fetchResponse;
//       }

//       logger.info(`Processed API response: ${JSON.stringify(processedData)}`);
//       return { 
//         response: processedData, 
//         error: false,
//         errorMessage: null
//       };
//     } catch (error: any) {
//       logger.error(`Error in ProcessApiResponseTool: ${error instanceof Error ? error.message : String(error)}`);
//       return { 
//         response: null,
//         error: true, 
//         errorMessage: error instanceof Error ? error.message : 'Failed to process API response.' 
//       };
//     }
//   }

//   private processTrackResponse(response: any): any {
//     // Implement track-specific response processing
//     return response;
//   }

//   private processUserResponse(response: any): any {
//     // Implement user-specific response processing
//     return response;
//   }
// }

// export async function processApiResponse({ bestApi }: { bestApi: any }): Promise<GraphState> {
//   const { LLMChain } = require("@langchain/core/runnables");
//   const { OpenAI } = require("@langchain/openai");

//   const prompt = ChatPromptTemplate.fromMessages([
//     [
//       "system",
//       `You are an expert software engineer, helping a junior engineer select the best API for their query.
// Given their query, use the 'Select_API' tool to select the best API for the query.`,
//     ],
//     ["human", `Query: {query}`],
//   ]);

//   const model = LLMChain({
//     llm: new OpenAI({
//       modelName: "gpt-3.5-turbo",
//       temperature: 0,
//     }),
//     prompt,
//   });

//   const tool = new ProcessApiResponseTool();
//   const modelWithTools = model.bindTools([tool]);

//   const chain = prompt.pipe(modelWithTools);

//   const response = await chain.invoke({ query: bestApi.query });

//   return response as GraphState;
// }
