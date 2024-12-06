export interface ApiResponse {
  response: string;
  error?: string;
}

export async function sendMessage(content: string): Promise<ApiResponse> {
  try {
    const response = await fetch('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: content,
        // We'll add these later when backend supports them
        // userId: 'user-1' 
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      response: '',
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}
