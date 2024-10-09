"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIGH_LEVEL_CATEGORY_MAPPING = exports.TRIMMED_CORPUS_PATH = void 0;
const path_1 = __importDefault(require("path"));
exports.TRIMMED_CORPUS_PATH = path_1.default.resolve('', '../data/trimmed_corpus.json');
exports.HIGH_LEVEL_CATEGORY_MAPPING = {
    Data_and_Analytics: [
        "Data",
        "Database",
        "Text_Analysis",
        "Visual_Recognition",
        "Artificial_Intelligence_Machine_Learning",
    ],
    Media_and_Entertainment: [
        "Movies",
        "Video_Images",
        "Media",
        "Entertainment",
        "Music",
        "Gaming",
    ],
    Business_and_Finance: [
        "Financial",
        "eCommerce",
        "Finance",
        "Business_Software",
        "Commerce",
        "Payments",
        "Business",
        "Jobs",
    ],
    Health_and_Wellness: ["Health_and_Fitness", "Medical", "Food"],
    Travel_and_Transportation: [
        "Travel",
        "Transportation",
        "Logistics",
        "Location",
    ],
    Education_and_Research: ["Education", "Science"],
    Communication_and_Social: ["Email", "SMS", "Social", "Communication"],
    Security_and_Monitoring: ["Cryptography", "Monitoring", "Cybersecurity"],
    Utilities_and_Tools: [
        "Translation",
        "Tools",
        "Search",
        "Storage",
        "Energy",
        "Devices",
        "Weather",
    ],
    Advertising_and_News: ["Advertising", "News_Media", "Events"],
};
//# sourceMappingURL=langtoolconstants.js.map