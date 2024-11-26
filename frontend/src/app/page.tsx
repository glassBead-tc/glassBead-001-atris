'use client';

import React from 'react';
import { QueryInput } from '../components/QueryInput';
import { QueryResponse } from '../components/QueryResponse';
import { LoadingState } from '../components/LoadingState';
import { useRetrievalAgent } from '../components/hooks/useRetrievalAgent';

export default function Home() {
  const {
    query,
    setQuery,
    state,
    isLoading,
    error,
    submitQuery
  } = useRetrievalAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuery(query);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Audius Documentation Assistant</h1>
      
      <QueryInput 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
      
      {isLoading && <LoadingState />}
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {state && <QueryResponse data={state} />}
    </main>
  );
}