import { GraphState } from "../index.js";

/**
 * @param {GraphState} state
 */
export async function createFetchRequest(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { parameters, bestApi } = state;
  if (!bestApi) {
    throw new Error("No best API found");
  }

  let response: any = null;
  try {
    if (!parameters) {
      const fetchRes = await fetch(bestApi.api_url, {
        method: bestApi.method,
      });
      response = fetchRes.ok ? await fetchRes.json() : await fetchRes.text();
    } else {
      let fetchOptions: Record<string, any> = {
        method: bestApi.method,
      };
      let parsedUrl = bestApi.api_url;

      const paramKeys = Object.entries(parameters);
      paramKeys.forEach(([key, value]) => {
        if (parsedUrl.includes(`{${key}}`)) {
          parsedUrl = parsedUrl.replace(`{${key}}`, value);
          delete parameters[key];
        }
      });

      const url = new URL(parsedUrl);

      if (["GET", "HEAD"].includes(bestApi.method)) {
        Object.entries(parameters).forEach(([key, value]) =>
          url.searchParams.append(key, value)
        );
      } else {
        fetchOptions = {
          ...fetchOptions,
          body: JSON.stringify(parameters),
        };
      }

      const fetchRes = await fetch(url, fetchOptions);
      response = fetchRes.ok ? await fetchRes.json() : await fetchRes.text();
    }

    if (response) {
      return {
        response,
      };
    }
  } catch (e) {
    console.error("Error fetching API");
    console.error(e);
  }

  return {
    response: null,
  };
}