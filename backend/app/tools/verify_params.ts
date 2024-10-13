import { logger } from '../logger.js';
import { GraphState } from '../types.js';
import { getUserInput } from '../graph/functions/getterFunctions.js';

export const verifyParams = async (state: GraphState): Promise<GraphState> => {
    logger.debug("Entering verifyParams function");
    const missingParams = Object.keys(state.params)
      .filter(param => !state.params[param] && param !== 'query');
    if (missingParams.length > 0) {
      logger.info("Additional information needed to answer the question accurately.");
      logger.debug(`Missing parameters: ${missingParams.join(', ')}`);
  
      const canGetUserInput = process.env.NODE_ENV !== 'test' && process.env.ALLOW_USER_INPUT === 'true';
      logger.debug(`Can get user input: ${canGetUserInput}`);
  
      for (const param of missingParams) {
        if (canGetUserInput) {
          let isValidInput = false;
          while (!isValidInput) {
            try {
              const userInput = await getUserInput(`Can you please provide ${param}? (Press Enter to skip): `);
              logger.debug(`User input for ${param}: ${userInput}`);
              if (userInput.trim() === "") {
                logger.debug(`User skipped providing ${param}.`);
                isValidInput = true;
              } else {
                state.params[param] = userInput.trim();
                isValidInput = true;
              }
            } catch (error) {
              logger.warn(`Error getting user input for ${param}: ${error}`);
              isValidInput = true; // Break the loop if we can't get user input
            }
          }
        } else {
          logger.debug(`Skipping user input for ${param} in current environment.`);
        }
      }
  
      logger.info("Parameter verification completed.");
    } else {
      logger.debug("No missing parameters, skipping verification.");
    }
    return state;
  };