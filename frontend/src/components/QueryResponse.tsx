import React from 'react';
import { GraphState } from '../../../backend/src/app/types';

interface QueryResponseProps {
  data: GraphState;
}

export function QueryResponse({ data }: QueryResponseProps) {
  const formatResponse = (state: GraphState) => {
    if (state.error) {
      return <div className="text-red-500">{state.error.message}</div>;
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="prose max-w-none">
            {state.response?.data?.toString()}
          </div>
          {state.urls && (
            <div className="mt-4 text-sm text-gray-500">
              <div className="font-medium">Sources:</div>
              <ul className="list-disc pl-5">
                {state.urls?.map((url, index) => (
                  <li key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Response</h2>
      {formatResponse(data)}
    </div>
  );
}