import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { createGraph } from "../../apps/backend/src/app/index";
import { START, END } from "@langchain/langgraph";
import { getServerConfig } from "../env.js";
import { StateGraph } from "@langchain/langgraph";

export interface GraphState {
  messages: Array<{
    content: string;
    role: 'user' | 'assistant' | 'system';
  }>;
  intermediateSteps?: Array<{
    thought: string;
    action?: string;
    observation?: string;
  }>;
  formattedResponse?: string;
}

export const createAgent = () => {
  const config = getServerConfig();
  
  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0.7,
    openAIApiKey: config.OPENAI_API_KEY
  });

  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      "You are a helpful AI assistant engaged in a conversation. " +
      "Maintain context of the conversation and provide relevant, " +
      "accurate responses based on the chat history."
    ),
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"]
  ]);

  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser()
  ]);

  // Create the graph
  const workflow = new StateGraph<GraphState>({
    channels: {
      messages: {
        value: (old, next) => next ?? old,
        default: () => []
      },
      intermediateSteps: {
        value: (old, next) => next ?? old,
        default: () => []
      },
      formattedResponse: {
        value: (old, next) => next ?? old,
        default: () => undefined
      }
    }
  });

  // Add nodes to the graph
  workflow
    .addNode("agent", async (state) => {
      const response = await chain.invoke({
        input: state.messages[state.messages.length - 1].content,
        chat_history: state.messages.slice(0, -1)
      });

      return {
        messages: [
          ...state.messages,
          { role: "assistant", content: response }
        ],
        formattedResponse: response
      };
    })
    .addEdge("agent", END)
    .addEdge(START, "agent");

  return workflow;
};
