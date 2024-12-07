import React, { useState } from 'react';
import { ChatWindow } from '../components/chat/window/ChatWindow';
import { v4 as uuidv4 } from 'uuid';
import { IconChat } from '@audius/stems'; 


export default function Home() {
  const [threadId] = useState(uuidv4());

  return (
    <div className="min-h-screen bg-[#FCFCFC] flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 justify-center mb-6">
            <IconChat className="w-8 h-8" />
            <h1 className="text-3xl font-bold text-center text-[#858199]">Atris AI</h1>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#F7F7F7]">
            <ChatWindow 
              endpoint="/api/agent"
              emptyStateComponent={
                <div className="text-[#858199] text-center p-4">
                  Start a conversation!
                </div>
              }
              titleText="Chat with AI"
              placeholder="Type your message..."
              showIngestForm={false}
              showIntermediateStepsToggle={false}
              threadId={threadId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
