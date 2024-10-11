"use client";

import React, { useEffect, useRef, useState } from "react";
import { readStreamableValue, StreamableValue } from "ai/rsc";

import { runAudiusAgent } from "./audiusAgentServer.js";
// Define the structure of the response from the agent

export default function Page() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [options] = useState({
    wso: false,
    streamEvents: false,
  });
  const [error, setError] = useState<string | null>(null); // State for error message

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input) return;
    setIsLoading(true);
    setData([]);
    setError(null); // Reset error state on new submission

    try {
      const { streamData } = await runAudiusAgent(input); // Pass input
      for await (const item of readStreamableValue(streamData as StreamableValue<any, any>)) {
        setData((prev) => [...prev, item as Record<string, any>]);
      }
    } catch (err) {
      setError("An error occurred while processing your request."); // Set error message
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-12 flex flex-col stretch gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          placeholder="Ask a question about Audius or any general topic..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
          disabled={isLoading}
        >
          Submit
        </button>
      </form>
      
      {error && ( // Display error message if it exists
        <div className="text-red-500">{error}</div>
      )}

      <div
        ref={scrollRef}
        className="flex flex-col gap-2 px-2 h-[650px] overflow-y-auto"
      >
        {data.map((item, i) => (
          <div key={i} className="p-4 bg-[#25252f] rounded-lg">
            {options.streamEvents ? (
              <>
                <strong>Event:</strong> <p className="text-sm">{item.event}</p>
              </>
            ) : (
              <strong className="text-center">Stream</strong>
            )}
            <br />
            <p className="break-all text-sm">
              {options.streamEvents
                ? JSON.stringify(item.data, null, 2)
                : JSON.stringify(item, null, 2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
