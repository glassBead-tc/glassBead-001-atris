import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { AudiusAPITool } from './audiusAgent.js';
import { AudiusSdk, sdk } from '@audius/sdk';
import { createStreamableValue, StreamableValue } from 'ai/rsc'; // Adjust the import path if necessary
import { checkRequiredEnvVars, getAudiusApiKey, getAudiusApiSecret, getOpenAiApiKey } from '../../config.js';

// Custom error type for Audius Agent
export class AudiusAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudiusAgentError";
  }
}

// Function to check and log environment variables for debugging
function checkEnvironmentVariables() {
  const requiredVars = ['NEXT_AUDIUS_API_KEY', 'NEXT_AUDIUS_API_SECRET', 'NEXT_OPENAI_API_KEY'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    throw new AudiusAgentError(`Missing environment variables: ${missingVars.join(', ')}`);
  }
}

export interface RunAudiusAgentResult {
  streamData?: StreamableValue<any, any>; // Optional streamData
  error?: string; // Optional error message
}

export async function runAudiusAgent(input: string): Promise<RunAudiusAgentResult> {
  try {
    checkRequiredEnvVars();
    checkEnvironmentVariables();

    // Use the functions to get the API keys
    const apiKey = getAudiusApiKey();
    const apiSecret = getAudiusApiSecret();

    if (!apiKey || !apiSecret) {
      throw new AudiusAgentError('Audius API key or secret is undefined');
    }

    // Initialize and use audiusSdk
    const audiusSdk: AudiusSdk = sdk({
      apiKey: apiKey,
      apiSecret: apiSecret,
      appName: 'Atris',
      environment: 'development'
    });

    // Pass the initialized audiusSdk to AudiusAPITool
    const audiusApiTool = new AudiusAPITool(audiusSdk, 'Atris');
    
    const openAiApiKey = getOpenAiApiKey();
    if (!openAiApiKey) {
      throw new AudiusAgentError('OpenAI API key is undefined');
    }

    // Initialize the ChatOpenAI model with configuration
    const chatModel = new ChatOpenAI({
      openAIApiKey: openAiApiKey,
      modelName: "gpt-3.5-turbo",
      temperature: parseFloat("0"),
      streaming: true,
    });

    // Set up the tools for the agent (only Audius API tool in this case)
    const tools = [audiusApiTool];

    // Create an OpenAI tools agent with the chat model, tools, and a custom prompt
    const agent = await createOpenAIToolsAgent({
      llm: chatModel,
      tools,
      prompt: ChatPromptTemplate.fromMessages([
        ["human", "You are an assistant that helps users interact with the Audius music platform. Use the Audius API to answer questions about tracks, artists, and playlists. Always use the appropriate API call for the user's request. {input}"],
        ["human", "This is the current conversation:\n{agent_scratchpad}"]
      ]),
    });

    // Use fromAgentAndTools instead of new AgentExecutor
    const agentExecutor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
    });

    // Create a streamable value for real-time updates
    const stream = createStreamableValue();

    // Use an IIFE to handle asynchronous operations
    (async () => {
      try {
        // Use streamEvents method
        const streamingEvents = await agentExecutor.streamEvents(
          { input },
          { version: "v2" }
        );

        // Iterate through the streaming events and update the stream
        for await (const event of streamingEvents) {
          stream.update(JSON.parse(JSON.stringify(event)));
        }

        // Mark the stream as complete
        stream.done();
      } catch (error) {
        // Handle any errors during agent execution
        console.error('Error in agent execution:', error);
        stream.update({ error: error instanceof Error ? error.message : 'An unknown error occurred.' });
        stream.done();
      }
    })();

    // Return the streamable value
    return { streamData: stream.value }; // Ensure this is always returned
  } catch (error) {
    if (error instanceof AudiusAgentError) {
      throw new AudiusAgentError(`Failed to run Audius agent: ${error.message}`);
    }
    // Return a structured error response
    return { streamData: undefined, error: 'An unexpected error occurred.' }; // Return undefined for streamData
  }
}

// Usage function to handle Audius agent requests
export async function handleAudiusAgent(input: string) {
  return runAudiusAgent(input);
}