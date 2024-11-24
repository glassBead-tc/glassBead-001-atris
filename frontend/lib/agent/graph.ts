/**
 * Audius Documentation Agent Graph
 * 
 * Implements a research-driven documentation agent using LangGraph.
 * The agent analyzes queries, retrieves relevant documentation,
 * and synthesizes contextual responses about the Audius protocol.
 */

import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

import {
  QueryType,
  RouterResult,
  ResearchStep,
  DocumentReference,
  ProtocolContext,
  AgentConfig
} from './types.js';

// State Type Definition
interface GraphState {
  messages: BaseMessage[];
  messageHistory: BaseMessage[];
  router: RouterResult | null;
  steps: ResearchStep[];
  currentStep: number;
  documents: DocumentReference[];
  confidence: number;
  response: string | null;
  debug: {
    lastError?: string;
    stepDurations: Record<string, number>;
    tokensUsed: number;
  };
}

// Model Configuration
const model = new ChatOpenAI({
  modelName: 'gpt-4-1106-preview',
  temperature: 0.7
});

// Prompts with clear visualization labels
const routerPrompt = PromptTemplate.fromTemplate(`
  You are an Audius protocol documentation assistant.
  Analyze the user's query to determine the appropriate research strategy.

  Current conversation:
  {messages}

  Classify the query based on:
  1. Type (PROTOCOL, API, NODE, GOVERNANCE, NEED_INFO)
  2. Required context (version, network, etc.)
  3. Research priority (HIGH, MEDIUM, LOW)

  Provide reasoning for your classification.
`);

const researchPrompt = PromptTemplate.fromTemplate(`
  Based on the query classification, create a research plan.
  Focus on gathering comprehensive information about {type}.

  Context from classification:
  {reasoning}

  Protocol Context:
  {context}

  Create a step-by-step plan to answer the query.
`);

const responsePrompt = PromptTemplate.fromTemplate(`
  Generate a response using the research results.

  Query Type: {type}
  Protocol Context: {context}

  Research Steps:
  {steps}

  Retrieved Documents:
  {documents}

  Synthesize this information into a clear, accurate response.
  Include specific references to protocol documentation.
`);

// Node Chains
const routerChain = RunnableSequence.from([
  {
    messages: (state: GraphState) => state.messages,
  },
  routerPrompt,
  model,
  new StringOutputParser(),
  async (output: string): Promise<Partial<GraphState>> => {
    // Parse router output to determine next step
    return { 
      router: { 
        type: 'NEED_INFO' as QueryType,
        reasoning: 'Need more information to proceed',
        context: {
          version: 'latest',
          network: 'mainnet',
          environment: 'production'
        },
        priority: 'MEDIUM'
      } 
    };
  }
]);

const researchChain = RunnableSequence.from([
  {
    type: (state: GraphState) => state.router?.type,
    reasoning: (state: GraphState) => state.router?.reasoning,
    context: (state: GraphState) => state.router?.context,
  },
  researchPrompt,
  model,
  new StringOutputParser(),
  async (output: string): Promise<Partial<GraphState>> => {
    // Parse research output into steps
    return { steps: [] };
  }
]);

const clarifyChain = RunnableSequence.from([
  {
    messages: (state: GraphState) => state.messages,
    router: (state: GraphState) => state.router,
  },
  async ({ messages, router }): Promise<Partial<GraphState>> => ({
    messages: [
      ...(messages || []),
      new AIMessage({ content: 'Could you clarify...' })
    ]
  })
]);

const responseChain = RunnableSequence.from([
  {
    type: (state: GraphState) => state.router?.type,
    context: (state: GraphState) => state.router?.context,
    steps: (state: GraphState) => state.steps,
    documents: (state: GraphState) => state.documents,
  },
  responsePrompt,
  model,
  new StringOutputParser(),
  async (output: string): Promise<Partial<GraphState>> => ({
    response: output,
    confidence: 0.9
  })
]);

// Channel Definitions
const graphChannels = {
  messages: {
    value: (old: BaseMessage[], next: BaseMessage[]) => next ?? old,
    default: () => []
  },
  messageHistory: {
    value: (old: BaseMessage[], next: BaseMessage[]) => [...(old || []), ...next],
    default: () => []
  },
  router: {
    value: (old: RouterResult | null, next: RouterResult | null) => next ?? old,
    default: () => null
  },
  steps: {
    value: (old: ResearchStep[], next: ResearchStep[]) => next ?? old,
    default: () => []
  },
  currentStep: {
    value: (old: number, next: number) => next ?? old,
    default: () => 0
  },
  documents: {
    value: (old: DocumentReference[], next: DocumentReference[]) => next ?? old,
    default: () => []
  },
  confidence: {
    value: (old: number, next: number) => next ?? old,
    default: () => 0
  },
  response: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  debug: {
    value: (old: { lastError?: string; stepDurations: Record<string, number>; tokensUsed: number },
           next: { lastError?: string; stepDurations: Record<string, number>; tokensUsed: number }) => next ?? old,
    default: () => ({
      stepDurations: {},
      tokensUsed: 0
    })
  }
} as const;

// Graph Construction
export function createAudiusAgent() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels
  });

  return graph
    .addNode("router", routerChain)
    .addNode("research", researchChain)
    .addNode("clarify", clarifyChain)
    .addNode("respond", responseChain)
    .addEdge(START, "router")
    .addEdge("router", "research")
    .addEdge("research", "respond")
    .addEdge("router", "clarify")
    .addEdge("clarify", "router")
    .addEdge("respond", END)
    .compile();
}
