"use server";

import { runAudiusAgent } from './audiusAgentServer.js';
import { StreamableValue } from 'ai/rsc/dist';

interface AudiusAgentResult {
  success: boolean;
  streamData?: AsyncIterable<unknown>;
  error?: string;
}

// Adapter to convert StreamableValue to AsyncIterable
class StreamableValueAsyncIterable implements AsyncIterable<unknown> {
  private streamable: StreamableValue<any, any>;

  constructor(streamable: StreamableValue<any, any>) {
    this.streamable = streamable;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
    for await (const chunk of this.streamable as AsyncIterable<unknown>) {
      yield chunk;
    }
  }
}

export async function executeAudiusAgent(input: ArrayBuffer): Promise<AudiusAgentResult> {
  try {
    // Convert ArrayBuffer to string
    const decoder = new TextDecoder('utf-8');
    const inputString = decoder.decode(input);
    
    const result = await runAudiusAgent(inputString);
    if (result === undefined) {
      throw new Error('Audius Agent returned undefined');
    }

    // Convert StreamableValue to AsyncIterable
    const asyncStreamData = new StreamableValueAsyncIterable(result.streamData as StreamableValue<any, any>);

    return {
      success: true,
      streamData: asyncStreamData,
    };
  } catch (error) {
    console.error('Error executing Audius Agent:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}