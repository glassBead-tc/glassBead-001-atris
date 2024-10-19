"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.RequestParamsTool = void 0;
var tools_1 = require("@langchain/core/tools");
var zod_1 = require("zod");
var logger_js_1 = require("../logger.js");
var utils_js_1 = require("../utils.js");
var RequestParamsTool = /** @class */ (function (_super) {
    __extends(RequestParamsTool, _super);
    function RequestParamsTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = "request_params";
        _this.description = "Prepares request parameters for the API call by ensuring all required parameters are present.";
        _this.schema = zod_1.z.object({
            state: zod_1.z.object({
                bestApi: zod_1.z.object({
                    required_parameters: zod_1.z.array(zod_1.z.object({
                        name: zod_1.z.string(),
                        type: zod_1.z.string(),
                        description: zod_1.z.string(),
                        default: zod_1.z.string().optional()
                    })),
                }),
                params: zod_1.z.record(zod_1.z.any()).optional(),
                error: zod_1.z.boolean().optional(),
                message: zod_1.z.string().optional(),
                // Add other relevant state properties
            }),
        });
        return _this;
    }
    RequestParamsTool.prototype._call = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var bestApi, params, requiredParamsKeys, extractedParamsKeys, missingParams, missingParamsSchemas, defaultParams_1, updatedParams, updatedExtractedParamsKeys, stillMissingParams, errorMessage;
            var state = _b.state;
            return __generator(this, function (_c) {
                logger_js_1.logger.info("Preparing request parameters");
                bestApi = state.bestApi, params = state.params;
                requiredParamsKeys = bestApi.required_parameters.map(function (_a) {
                    var name = _a.name;
                    return name;
                });
                extractedParamsKeys = Object.keys(params !== null && params !== void 0 ? params : {});
                missingParams = (0, utils_js_1.findMissingParams)(requiredParamsKeys, extractedParamsKeys);
                if (missingParams.length > 0) {
                    logger_js_1.logger.info("Missing required parameters: ".concat(missingParams.join(", ")));
                    missingParamsSchemas = missingParams.map(function (missingParamKey) {
                        return bestApi.required_parameters.find(function (_a) {
                            var name = _a.name;
                            return name === missingParamKey;
                        });
                    }).filter(function (p) { return p !== undefined; });
                    defaultParams_1 = {};
                    missingParamsSchemas.forEach(function (param) {
                        if (param.default) {
                            defaultParams_1[param.name] = param.default;
                            logger_js_1.logger.info("Using default value for ".concat(param.name, ": ").concat(param.default));
                        }
                        else {
                            logger_js_1.logger.warn("No default value for required parameter: ".concat(param.name));
                        }
                    });
                    updatedParams = __assign(__assign({}, params), defaultParams_1);
                    updatedExtractedParamsKeys = Object.keys(updatedParams);
                    stillMissingParams = (0, utils_js_1.findMissingParams)(requiredParamsKeys, updatedExtractedParamsKeys);
                    if (stillMissingParams.length > 0) {
                        errorMessage = "Missing required parameters without default values: ".concat(stillMissingParams.join(", "));
                        logger_js_1.logger.error(errorMessage);
                        return [2 /*return*/, {
                                error: true,
                                message: errorMessage,
                            }];
                    }
                    // All required parameters are now present
                    return [2 /*return*/, {
                            params: updatedParams,
                        }];
                }
                else {
                    // All required parameters are present
                    return [2 /*return*/, {
                            params: params,
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    return RequestParamsTool;
}(tools_1.StructuredTool));
exports.RequestParamsTool = RequestParamsTool;