"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAiApiKey = getOpenAiApiKey;
exports.getAudiusApiKey = getAudiusApiKey;
exports.getAudiusApiSecret = getAudiusApiSecret;
exports.checkRequiredEnvVars = checkRequiredEnvVars;
var dotenv_1 = require("dotenv");
var url_1 = require("url");
var path_1 = require("path");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function getOpenAiApiKey() {
    var apiKey = process.env.OPENAI_API_KEY;
    // console.log("API Key:", apiKey); // Add this line for debugging
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
    }
    return apiKey;
}
function getAudiusApiKey() {
    var apiKey = process.env.AUDIUS_API_KEY;
    if (!apiKey) {
        throw new Error('AUDIUS_API_KEY is not defined in the environment variables.');
    }
    return apiKey;
}
function getAudiusApiSecret() {
    var apiSecret = process.env.AUDIUS_API_SECRET;
    if (!apiSecret) {
        throw new Error('AUDIUS_API_SECRET is not defined in the environment variables.');
    }
    return apiSecret;
}
function checkRequiredEnvVars() {
    getOpenAiApiKey();
    getAudiusApiKey();
    getAudiusApiSecret();
}
