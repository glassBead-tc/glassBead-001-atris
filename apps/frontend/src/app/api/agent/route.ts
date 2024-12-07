import { NextRequest } from 'next/server';
import { createAgent } from '@/agent';
import { getServerConfig } from '@/env';
import { END } from '@langchain/langgraph';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const config = getServerConfig();
    
    const { content, threadId } = await request.json();
    const agent = createAgent();

    // Create a TransformStream for streaming the response
    const encoder = new TextEncoder();

    const stream = new TransformStream({
      async transform(chunk, controller) {
        if (chunk.isAIMessage) {
          // Handle AI messages
          controller.enqueue(encoder.encode(JSON.stringify({
            id: chunk.id,
            role: 'assistant',
            content: chunk.content,
          }) + '\n'));
        } else {
          // Handle intermediate steps (thoughts and actions)
          controller.enqueue(encoder.encode(JSON.stringify({
            id: chunk.id || Date.now().toString(),
            role: 'assistant',
            content: JSON.stringify({
              thought: chunk.thought,
              action: chunk.action ? {
                name: chunk.action.name,
                args: chunk.action.args || {},
              } : undefined,
              observation: chunk.observation,
            }),
          }) + '\n'));
        }
      }
    });

    const agentStream = await agent.compile().stream({
      messages: [{ role: 'user', content }]
    });

    // Start streaming the response
    const writer = stream.writable.getWriter();
    
    (async () => {
      try {
        for await (const output of agentStream) {
          if (output === END) break;
          await writer.write(output);
        }
      } finally {
        writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in agent route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
