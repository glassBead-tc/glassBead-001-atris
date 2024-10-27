import React from 'react';
import { fetchAgentData } from '../lib/api';

export default async function Page() {
  const data = await fetchAgentData('agent-endpoint');

  return (
    <div>
      <h1>Welcome to Atris Frontend!</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
