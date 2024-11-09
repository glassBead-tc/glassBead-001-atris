// import { ChatOpenAI } from "@langchain/openai";
// import { StateGraph, END } from "@langchain/langgraph";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// import dotenv from 'dotenv';

// dotenv.config();

// type MinimalState = {
//   query: string | null;
//   result: string | null;
// };

// async function createMinimalGraph() {
//   const model = new ChatOpenAI({});
//   const outputParser = new StringOutputParser();

//   const graph = new StateGraph<MinimalState>({
//     channels: {
//       query: {
//         value: (old: string | null, next: string) => next ?? old,
//         default: () => null
//       },
//       result: {
//         value: (old: string | null, next: string) => next ?? old,
//         default: () => null
//       }
//     }
//   });

//   // Single processing node
//   graph.addNode("process", async (state: MinimalState) => {
//     console.log("Processing query:", state.query);
    
//     const result = await model
//       .pipe(outputParser)
//       .invoke(`Process this query: ${state.query}`);
    
//     return {
//       ...state,
//       result
//     };
//   });

//   // Simple linear flow: process -> END
//   graph.addConditionalEdges("__start__", async () => "process");
//   graph.addEdge("process", END);

//   return graph.compile();
// }

// async function testStream() {
//   try {
//     const graph = await createMinimalGraph();
//     console.log("Graph created");

//     const stream = await graph.stream({
//       query: "test query",
//       result: null
//     });

//     for await (const chunk of stream) {
//       console.log("Stream chunk:", chunk);
//     }

//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// if (process.env.NODE_ENV !== 'test') {
//   testStream();
// }