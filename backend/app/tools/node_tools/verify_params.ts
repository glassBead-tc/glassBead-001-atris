import { logger } from '../../logger.js';
import { GraphState } from '../../types.js';
import { getUserInput } from '../../graph/functions/getterFunctions.js';

type ParamKey = keyof GraphState['params'];

export const verifyParams = async (state: GraphState): Promise<GraphState> => {
    logger.debug("Entering verifyParams function");
    const paramKeys: ParamKey[] = ['timeframe', 'limit'];
    const missingParams = paramKeys.filter(param => !state.params[param]);

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
                            if (param === 'limit') {
                                const limitValue = parseInt(userInput.trim(), 10);
                                if (!isNaN(limitValue)) {
                                    state.params.limit = limitValue;
                                    isValidInput = true;
                                } else {
                                    logger.warn(`Invalid input for limit. Please enter a number.`);
                                }
                            } else if (param === 'timeframe') {
                                state.params.timeframe = userInput.trim();
                                isValidInput = true;
                            }
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
