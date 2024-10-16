"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalAudiusApi = exports.AudiusApiService = void 0;
var sdk_1 = require("@audius/sdk"); // Named imports
var types_js_1 = require("../types.js");
var logger_js_1 = require("../logger.js"); // Correct import without '.js'
var zod_1 = require("zod");
var dotenv_1 = require("dotenv");
var config_js_1 = require("../config.js");
// Load environment variables
dotenv_1.default.config({ path: '.env' });
// Define a schema for environment variables using Zod
var envSchema = zod_1.z.object({
    AUDIUS_API_KEY: zod_1.z.string().nonempty(),
    AUDIUS_APP_NAME: zod_1.z.string().nonempty(),
    AUDIUS_DISCOVERY_PROVIDER: zod_1.z.string().nonempty(),
    AUDIUS_CREATOR_NODE_ENDPOINT: zod_1.z.string().nonempty(),
    AUDIUS_ENVIRONMENT: zod_1.z.enum(['development', 'staging', 'production']),
});
// Validate environment variables
var env = envSchema.safeParse(process.env);
if (!env.success) {
    logger_js_1.logger.error('❌ Invalid environment variables:', env.error.format());
    process.exit(1); // Exit the application if validation fails
}
var _a = env.data, AUDIUS_API_KEY = _a.AUDIUS_API_KEY, AUDIUS_APP_NAME = _a.AUDIUS_APP_NAME, AUDIUS_DISCOVERY_PROVIDER = _a.AUDIUS_DISCOVERY_PROVIDER, AUDIUS_CREATOR_NODE_ENDPOINT = _a.AUDIUS_CREATOR_NODE_ENDPOINT, AUDIUS_ENVIRONMENT = _a.AUDIUS_ENVIRONMENT;
// Create the discoveryNodeSelector
var discoveryNodeSelector = new sdk_1.DiscoveryNodeSelector({
    initialSelectedNode: AUDIUS_DISCOVERY_PROVIDER,
});
// Create an object that implements the AuthService interface
var authService = {
    getSharedSecret: function (publicKey) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, new Uint8Array()];
    }); }); },
    sign: function (data) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, [new Uint8Array(), 0]];
    }); }); },
    hashAndSign: function (data) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ''];
    }); }); },
    signTransaction: function (data) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ''];
    }); }); },
    getAddress: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ''];
    }); }); },
};
// Create the storageNodeSelector
var storageNodeSelector = new sdk_1.StorageNodeSelector({
    auth: authService,
    discoveryNodeSelector: discoveryNodeSelector,
});
var AudiusApiService = /** @class */ (function () {
    function AudiusApiService(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Tests the connection to the Audius API.
     * @returns A boolean indicating the success of the connection.
     */
    AudiusApiService.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var trackId, timeoutPromise, responsePromise, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger_js_1.logger.debug('Starting API connection test');
                        logger_js_1.logger.debug('Preparing request to getTrack');
                        trackId = 'gWgbP1d';
                        logger_js_1.logger.debug("Request parameters: trackId=".concat(trackId));
                        timeoutPromise = new Promise(function (_, reject) {
                            return setTimeout(function () { return reject(new Error('API request timed out')); }, 5000);
                        });
                        logger_js_1.logger.debug('Sending request to getTrack');
                        responsePromise = this.audiusSdk.tracks.getTrack({ trackId: trackId });
                        return [4 /*yield*/, Promise.race([responsePromise, timeoutPromise])];
                    case 1:
                        response = _a.sent();
                        logger_js_1.logger.debug("API response received");
                        if (response && response.data) {
                            logger_js_1.logger.info('Audius SDK connection successful.');
                            return [2 /*return*/, true];
                        }
                        else {
                            logger_js_1.logger.warn('API connection test returned unexpected response');
                            return [2 /*return*/, false];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logger_js_1.logger.error('Failed to test Audius SDK connection:', error_1 instanceof Error ? error_1.message : String(error_1));
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
   * Retrieves a user's tracks.
   * @param userId - The ID of the user.
   * @param limit - The number of tracks to retrieve.
   * @returns An ApiResponse containing an array of tracks.
   */
    // Example correction if 'getTrack' is the correct method
    AudiusApiService.prototype.getUserTracks = function (userId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, trackResponse, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { query: userId, limit: limit };
                        return [4 /*yield*/, this.audiusSdk.tracks.searchTracks(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('getUserTracks response:', response);
                        trackResponse = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (track) { return ({
                            id: track.id,
                            title: track.title,
                            user: {
                                name: track.user.name,
                            },
                            playCount: track.playCount // Assuming play_count is available in the response
                        }); })) || [];
                        return [2 /*return*/, { data: trackResponse }];
                    case 2:
                        error_2 = _b.sent();
                        logger_js_1.logger.error('Failed to get user tracks:', error_2);
                        throw new Error('Failed to get user tracks.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Searches for genres based on the provided query and limit.
     * @param query - The search query string.
     * @param limit - The number of genres to retrieve.
     * @returns An ApiResponse containing an array of genre names.
     */
    AudiusApiService.prototype.searchGenres = function (query, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var allGenres, matchedGenres, limitedGenres;
            return __generator(this, function (_a) {
                try {
                    allGenres = Object.entries(types_js_1.GroupedGenres).flatMap(function (_a) {
                        var key = _a[0], value = _a[1];
                        if (typeof value === 'string') {
                            return value;
                        }
                        else if (typeof value === 'object') {
                            return Object.values(value);
                        }
                        return [];
                    });
                    matchedGenres = allGenres.filter(function (genre) {
                        return genre.toLowerCase().includes(query.toLowerCase());
                    });
                    limitedGenres = matchedGenres.slice(0, limit);
                    logger_js_1.logger.debug('searchGenres response:', limitedGenres);
                    return [2 /*return*/, { data: limitedGenres }];
                }
                catch (error) {
                    logger_js_1.logger.error('Failed to search genres:', error);
                    throw new Error('Failed to search genres.');
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Retrieves tracks matching the search criteria.
     * @param query - The search query string.
     * @param limit - The number of tracks to retrieve.
     * @returns An ApiResponse containing an array of tracks.
     */
    AudiusApiService.prototype.searchTracks = function (query, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, tracks, trackResponse, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { query: query, limit: 5 };
                        return [4 /*yield*/, this.audiusSdk.tracks.searchTracks(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('searchTracks response:', response);
                        tracks = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (track) { return track.title; })) || [];
                        trackResponse = tracks.map(function (track) { return ({ title: track }); });
                        return [2 /*return*/, { data: trackResponse }];
                    case 2:
                        error_3 = _b.sent();
                        logger_js_1.logger.error('Failed to search tracks:', error_3);
                        throw new Error('Failed to search tracks.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves users matching the search criteria.
     * @param query - The search query string.
     * @param limit - The number of users to retrieve.
     * @returns An ApiResponse containing an array of users.
     */
    /**
     * Retrieves users matching the search criteria.
     * @param query - The search query string.
     * @param limit - The number of users to retrieve.
     * @returns An ApiResponse containing an array of users.
     */
    AudiusApiService.prototype.searchUsers = function (query, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, users, userResponse, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { query: query, limit: limit };
                        return [4 /*yield*/, this.audiusSdk.users.searchUsers(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('searchUsers response:', response);
                        users = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (user) { return user.name; })) || [];
                        userResponse = users.map(function (user) { return ({ name: user }); });
                        return [2 /*return*/, { data: userResponse }];
                    case 2:
                        error_4 = _b.sent();
                        logger_js_1.logger.error('Failed to search users:', error_4);
                        throw new Error('Failed to search users.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
   * Retrieves playlists matching the search criteria.
   * @param query - The search query string.
   * @param limit - The number of playlists to retrieve.
   * @returns An ApiResponse containing an array of playlists.
   */
    AudiusApiService.prototype.searchPlaylists = function (query, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, playlists, playlistResponse, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { query: query, limit: limit };
                        return [4 /*yield*/, this.audiusSdk.playlists.searchPlaylists(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('searchPlaylists response:', response);
                        playlists = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (playlist) { return playlist.playlistName; })) || [];
                        playlistResponse = playlists.map(function (playlist) { return ({ playlistName: playlist }); });
                        return [2 /*return*/, { data: playlistResponse }];
                    case 2:
                        error_5 = _b.sent();
                        logger_js_1.logger.error('Failed to search playlists:', error_5);
                        throw new Error('Failed to search playlists.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves trending tracks.
     * @param limit - The number of trending tracks to retrieve.
     * @returns An ApiResponse containing an array of trending tracks.
     */
    AudiusApiService.prototype.getTrendingTracks = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var response, tracks, trackResponse, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.audiusSdk.tracks.getTrendingTracks()];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('getTrendingTracks response:', response);
                        tracks = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.slice(0, limit).map(function (track) { return track.title; })) || [];
                        trackResponse = tracks.map(function (track) { return ({ title: track }); });
                        return [2 /*return*/, { data: trackResponse }];
                    case 2:
                        error_6 = _b.sent();
                        logger_js_1.logger.error('Failed to get trending tracks:', error_6);
                        throw new Error('Failed to get trending tracks.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves followers of a user.
     * @param userId - The ID of the user.
     * @param limit - The number of followers to retrieve.
     * @returns An ApiResponse containing an array of followers.
     */
    AudiusApiService.prototype.getUserFollowers = function (userId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, followers, followerResponse, error_7;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { id: userId, limit: limit };
                        return [4 /*yield*/, this.audiusSdk.users.getFollowers(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('getUserFollowers response:', response);
                        followers = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (user) { return user.name; })) || [];
                        followerResponse = followers.map(function (user) { return ({ name: user }); });
                        return [2 /*return*/, { data: followerResponse }];
                    case 2:
                        error_7 = _b.sent();
                        logger_js_1.logger.error('Failed to get user followers:', error_7);
                        throw new Error('Failed to get user followers.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves users that a specific user is following.
     * @param userId - The ID of the user.
     * @param limit - The number of following users to retrieve.
     * @returns An ApiResponse containing an array of users.
     */
    AudiusApiService.prototype.getUserFollowing = function (userId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var request, response, following, followingResponse, error_8;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        request = { id: userId, limit: limit };
                        return [4 /*yield*/, this.audiusSdk.users.getFollowing(request)];
                    case 1:
                        response = _b.sent();
                        logger_js_1.logger.debug('getUserFollowing response:', response);
                        following = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.map(function (user) { return user.name; })) || [];
                        followingResponse = following.map(function (user) { return ({ name: user }); });
                        return [2 /*return*/, { data: followingResponse }];
                    case 2:
                        error_8 = _b.sent();
                        logger_js_1.logger.error('Failed to get user following:', error_8);
                        throw new Error('Failed to get user following.');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves the play count for a specific track.
     * @param trackId - The ID of the track.
     * @returns The play count of the track.
     */
    AudiusApiService.prototype.getTrackPlayCount = function (trackId) {
        return __awaiter(this, void 0, void 0, function () {
            var track, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger_js_1.logger.info("Fetching play count for track ID: ".concat(trackId));
                        return [4 /*yield*/, this.audiusSdk.tracks.getTrack({ trackId: trackId })];
                    case 1:
                        track = _a.sent();
                        if (track && track.data && typeof track.data.playCount === 'number') {
                            logger_js_1.logger.debug("Play count for track ID ".concat(trackId, ": ").concat(track.data.playCount));
                            return [2 /*return*/, { play_count: track.data.playCount }];
                        }
                        else {
                            logger_js_1.logger.warn("Play count not found for track ID: ".concat(trackId));
                            throw new Error("Play count data is unavailable.");
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        logger_js_1.logger.error("Error fetching play count for track ID ".concat(trackId, ":"), error_9);
                        throw new Error("Failed to retrieve play count from Audius API.");
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AudiusApiService;
}());
exports.AudiusApiService = AudiusApiService;
// Initialize the Audius SDK instance with proper configuration
var audiusSdkInstance = (0, sdk_1.sdk)({
    apiKey: (0, config_js_1.getAudiusApiKey)(),
    apiSecret: (0, config_js_1.getAudiusApiSecret)(),
    appName: AUDIUS_APP_NAME,
    services: {
        discoveryNodeSelector: discoveryNodeSelector,
        storageNodeSelector: storageNodeSelector,
    },
    environment: AUDIUS_ENVIRONMENT,
});
// Export the singleton instance
exports.globalAudiusApi = new AudiusApiService(audiusSdkInstance);
