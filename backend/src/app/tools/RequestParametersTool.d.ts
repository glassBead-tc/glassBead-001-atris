import { GraphState } from "../index.js";
import { DatasetParameters } from "../types.js";
/**
 * Read the user input from the command line
 * TODO: implement & add args
 * @param {DatasetParameters[]} missingParams
 */
export declare function readUserInput(missingParams: DatasetParameters[]): Promise<string>;
/**
 * Parse the user input string into a key-value pair
 * TODO: implement
 * @param {string} input
 */
export declare function parseUserInput(input: string): Record<string, string>;
/**
 * @param {GraphState} state
 */
export declare function requestParameters(state: GraphState): Promise<Partial<GraphState>>;
