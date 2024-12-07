import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain/agents";
import { AgentExecutor, AgentStep } from "@langchain/core/agents";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { StateGraph, END } from "@langchain/langgraph";

import { getServerConfig } from "./env";

export interface AgentState {
  messages: BaseMessage[];
  steps: AgentStep[];
}

export function createAgent() {
  const config = getServerConfig();
  const model = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    streaming: true,
  });

  // Define the function that determines the next step
  const shouldContinue = (state: AgentState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const lastStep = state.steps[state.steps.length - 1];

    // If we have a final answer, we're done
    if (lastMessage instanceof AIMessage) {
      return "end";
    }

    // Otherwise, continue
    return "continue";
  };

  // Define the agent state graph
  const workflow = new StateGraph({
    channels: ["messages", "steps"],
  });

  // Define the agent node
  const agentNode = RunnableSequence.from([
    {
      messages: (state: AgentState) => state.messages,
      steps: (state: AgentState) => state.steps,
    },
    model,
    (output: AIMessage) => ({ messages: [output], steps: [] }),
  ]);

  // Add the agent node to the graph
  workflow.addNode("agent", agentNode);

  // Add edges
  workflow.addEdge("agent", "continue");
  workflow.addEdge("agent", "end");

  // Set the entry point
  workflow.setEntryPoint("agent");

  // Compile the graph into a runnable unit
  const app = workflow.compile();

  return {
    compile: () => app,
  };
}

export { END };
