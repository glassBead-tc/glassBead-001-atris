import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from '../logger.js';
export class ProcessApiResponseTool extends StructuredTool {
    name = "process_api_response";
    description = "Processes the response received from the API fetch request.";
    schema = z.object({
        state: z.object({
            fetchResponse: z.any().describe("Response from the API fetch request"),
            bestApi: z.any().nullable().optional(),
            // ... include other necessary fields from GraphState
        }),
    });
    async _call({ state }) {
        try {
            const { fetchResponse, bestApi } = state;
            if (!fetchResponse) {
                throw new Error("No response received from the API.");
            }
            // Example processing logic based on API type
            let processedData = {};
            switch (bestApi.api_name) {
                case 'TrackAPI':
                    processedData = this.processTrackResponse(fetchResponse);
                    break;
                case 'UserAPI':
                    processedData = this.processUserResponse(fetchResponse);
                    break;
                // Add more cases as needed
                default:
                    processedData = fetchResponse;
            }
            logger.info(`Processed API response: ${JSON.stringify(processedData)}`);
            return {
                response: processedData,
                error: false,
                message: null
            };
        }
        catch (error) {
            logger.error(`Error in ProcessApiResponseTool: ${error instanceof Error ? error.message : String(error)}`);
            return {
                response: null,
                error: true,
                message: error instanceof Error ? error.message : 'Failed to process API response.'
            };
        }
    }
    processTrackResponse(response) {
        // Implement track-specific response processing
        return response;
    }
    processUserResponse(response) {
        // Implement user-specific response processing
        return response;
    }
}
export async function processApiResponse(state) {
    logger.debug(`Processing API response for state: ${JSON.stringify(state)}`);
    return new ProcessApiResponseTool()._call({ state });
}
