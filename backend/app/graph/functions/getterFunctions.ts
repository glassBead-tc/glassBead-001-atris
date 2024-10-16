import { GraphState } from "../../types.js";
import { logger } from "../../logger.js";
import { getApis } from "../../tools/node_tools/get_apis.js";
import readline from 'readline';

export const get_apis = async (state: GraphState): Promise<GraphState> => {
    logger.debug(`State before getApis: ${JSON.stringify(state)}`);
    const result = await getApis(state);
    logger.debug(`Result from getApis: ${JSON.stringify(result)}`);
    const newState = { ...state, ...result };
    logger.debug(`New state after getApis: ${JSON.stringify(newState)}`);
    return newState;
};

export const getUserInput = async (prompt: string): Promise<string> => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  };


  