import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from '../logger.js';
import { findMissingParams } from './utils/findMissingParams.js';
export class VerifyParamsTool extends StructuredTool {
    name = "verify_params";
    description = "Verifies that all necessary parameters are present for the API call.";
    schema = z.object({
        state: z.object({
            params: z.record(z.any()),
            bestApi: z.any(), // Replace 'any' with the appropriate type
        }),
    });
    async _call({ state }) {
        try {
            // Perform verification logic based on bestApi requirements
            const requiredParams = state.bestApi?.required_parameters || [];
            const missingParams = requiredParams.filter((param) => !(param in state.params));
            if (missingParams.length > 0) {
                const errorMessage = `Missing required parameters: ${missingParams.join(', ')}`;
                logger.error(errorMessage);
                return {
                    error: true,
                    message: errorMessage,
                };
            }
            return {
                error: false,
                message: "Parameters verified successfully.",
            };
        }
        catch (error) {
            logger.error(`Error in VerifyParamsTool: ${error instanceof Error ? error.message : String(error)}`);
            return {
                error: true,
                message: "Failed to verify parameters.",
            };
        }
    }
}
export async function verifyParams(state) {
    const requiredParameters = state.bestApi?.required_parameters?.map(param => param.name) || [];
    const missingParams = findMissingParams(requiredParameters, Object.keys(state.params || {}));
    if (missingParams.length > 0) {
        logger.info("Additional information needed to answer the question accurately.");
        logger.debug(`Missing parameters: ${missingParams.join(', ')}`);
        return {
            error: true,
            message: "Missing parameters",
        };
    }
    return {
        error: false,
        message: "Parameters verified successfully.",
    };
}
