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

    if (!state.response?.data) {
      return <div>No data available</div>;
    }

    return (
      <div className="space-y-4">
        {Array.isArray(state.response.data) ? (
          state.response.data.map((item, index) => (
            <div key={index} className="p-4 bg-white rounded-lg shadow">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div className="p-4 bg-white rounded-lg shadow">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(state.response.data, null, 2)}
            </pre>
          </div>
        )}
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