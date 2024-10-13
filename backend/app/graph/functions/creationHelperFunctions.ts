import { GraphState } from "../../types.js";
import { logger } from "../../logger.js";
import { classifyQuery } from "../../modules/queryClassifier.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 30000; // 30 seconds

export const classifyQueryWrapper = async (state: GraphState): Promise<Partial<GraphState>> => {
    const classification = await classifyQuery(state.query);
    const entityType = classification.entityType as 'user' | 'track' | 'playlist' | 'genre' | null;
    return {
      queryType: classification.type,
      isEntityQuery: classification.isEntityQuery,
      entityType: entityType,
      entity: classification.entity,
      complexity: classification.complexity,
    };
};

export const wrapNodeLogic = (nodeName: string, logic: (state: GraphState) => Promise<Partial<GraphState>> | Partial<GraphState>) => {
    return async (state: GraphState): Promise<GraphState> => {
      logger.debug(`Entering ${nodeName} node`);
      try {
        const result = await withTimeout(withRetry(async () => {
          const logicResult = logic(state);
          return logicResult instanceof Promise ? await logicResult : logicResult;
        }, MAX_RETRIES, RETRY_DELAY), TIMEOUT);
        
        const newState = { ...state, ...result };
        logger.debug(`State after ${nodeName}: ${JSON.stringify(newState)}`);
        return newState;
      } catch (error) {
        logger.error(`Error in ${nodeName}: ${error instanceof Error ? error.message : String(error)}`);
        return { 
          ...state, 
          error: error instanceof Error ? error.message : `Unknown error in ${nodeName}`
        };
      }
    };
};
  
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
  
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  };
  
const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number, delay: number): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        logger.warn(`Retry ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
  throw new Error('Max retries reached');

};


export const logFinalResult = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Final result: ${state.formattedResponse}`);
  return state;
};

