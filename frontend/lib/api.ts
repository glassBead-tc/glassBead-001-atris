const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function fetchAgentData(endpoint: string) {
  const res = await fetch(`${BACKEND_URL}/${endpoint}`);
  if (!res.ok) {
    throw new Error('Failed to fetch data from backend agent');
  }
  return res.json();
}
