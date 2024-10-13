import { GraphState, DatasetSchema } from "../types.js";
import { logger } from '../logger.js';
import { parseQuery } from "../utils/searchUtils.js";

interface QueryStep {
  api: string;
  params: Record<string, any>;
}

export async function handleMultiStepQuery(state: GraphState): Promise<Partial<GraphState>> {
  const { query, bestApi } = state;
  const parsedQuery = parseQuery(query);
  
  const steps = identifyQuerySteps(parsedQuery, bestApi?.api_name);
  
  if (steps.length === 0) {
    logger.warn(`No steps identified for query: ${query}`);
    return { 
      error: "Unable to process query. Please try a different question.",
      message: "The query could not be processed. Please try rephrasing your question."
    };
  }
  
  // For now, we'll just return the first step as the bestApi
  // In a full implementation, we'd execute each step and combine the results
  const firstStep = steps[0];
  const updatedBestApi: DatasetSchema = {
    id: state.bestApi?.id || `audius_${firstStep.api.replace(/\//g, '_')}`,
    category_name: state.bestApi?.category_name || 'Audius',
    tool_name: state.bestApi?.tool_name || `Audius ${firstStep.api}`,
    api_name: firstStep.api,
    api_description: state.bestApi?.api_description || `API endpoint for ${firstStep.api}`,
    required_parameters: state.bestApi?.required_parameters || [],
    optional_parameters: state.bestApi?.optional_parameters || [],
    method: state.bestApi?.method || 'GET',
    api_url: state.bestApi?.api_url || `https://discoveryprovider.audius.co${firstStep.api}`,
    parameters: firstStep.params
  };

  logger.info(`Multi-step query processed: ${steps.length} step(s) identified`);
  return { 
    bestApi: updatedBestApi,
    message: `Query processed with ${steps.length} step(s)`
  };
}

function identifyQuerySteps(parsedQuery: ReturnType<typeof parseQuery>, selectedApi?: string): QueryStep[] {
  const steps: QueryStep[] = [];
  
  switch (parsedQuery.type) {
    case 'topTracks':
    case 'tracks':
      steps.push({ api: '/v1/tracks/trending', params: { limit: parsedQuery.limit || 3 } });
      break;
    case 'mostFollowers':
    case 'users':
      steps.push(
        { api: '/v1/users/search', params: { query: parsedQuery.artist || '', limit: 1 } },
        { api: '/v1/users/{user_id}', params: {} }
      );
      break;
    case 'followers':
      steps.push(
        { api: '/v1/users/search', params: { query: parsedQuery.artist || '', limit: 1 } },
        { api: '/v1/users/{user_id}', params: {} }
      );
      break;
    case 'genre':
    case 'trackInfo':
      steps.push(
        { api: '/v1/tracks/search', params: { query: `${parsedQuery.title} ${parsedQuery.artist}`.trim(), limit: 10 } },
      );
      break;
    case 'latestReleases':
      steps.push({ api: '/v1/tracks/trending', params: { limit: 10, time: "week" } });
      break;
    case 'trendingGenres':
      steps.push({ api: '/v1/tracks/trending', params: { limit: 100 } });
      // We'd need to process the results to extract genres in the API response handling
      break;
    default:
      if (selectedApi) {
        steps.push({ api: selectedApi, params: {} });
      } else {
        logger.warn(`Unhandled query type: ${parsedQuery.type}`);
      }
  }
  
  return steps;
}
