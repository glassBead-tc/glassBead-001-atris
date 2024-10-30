import { NextRequest, NextResponse } from 'next/server';
import { main } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query format' }, 
        { status: 400 }
      );
    }

    const response = await main([query]);
    return NextResponse.json({ response });
    
  } catch (err) {
    const error = err as Error;
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' }, 
      { status: 500 }
    );
  }
} 