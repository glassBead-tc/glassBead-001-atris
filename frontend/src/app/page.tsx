'use client';

import React, { useState } from 'react';
import { QueryInput } from '@/components/QueryInput';
import { QueryResponse } from '@/components/QueryResponse';
import { LoadingState } from '@/components/LoadingState';

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      setResponse(data.response);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <QueryInput 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSubmit={handleSubmit}
        disabled={loading}
      />
      
      {loading && <LoadingState />}
      {error && <div className="text-red-500">{error}</div>}
      {response && <QueryResponse data={response} />}
    </main>
  );
} 