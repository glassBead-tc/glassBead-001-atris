import React, { useState } from 'react';
import { ChatWindow } from '../components/chat/window/ChatWindow';
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
  // Generate a unique thread ID for the session
  const [threadId] = useState(uuidv4());

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">AI Chatbot</h1>
          <ChatWindow 
            endpoint="/api/agent"
            emptyStateComponent={<div>Start a conversation!</div>}
            titleText="Chat with AI"
            placeholder="Type your message..."
            showIngestForm={false}
            showIntermediateStepsToggle={false}
            threadId={threadId}
          />
        </div>
      </main>
    </div>
  );
}
