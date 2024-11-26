import { useState } from 'react';
import { queryAgent } from '../../lib/agent';
import { GraphState } from '../../../../backend/src/app/types';

export function useRetrievalAgent() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<GraphState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitQuery = async (userQuery: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await queryAgent(userQuery);
      setState(response.state);
      if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    query,
    setQuery,
    state,
    isLoading,
    error,
    submitQuery
  };
}
