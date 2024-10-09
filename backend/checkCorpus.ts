import fs from "fs";
import path from "path";
import { TRIMMED_CORPUS_PATH } from "./src/constants.js";

function checkCorpus() {
    try {
        if (!fs.existsSync(TRIMMED_CORPUS_PATH)) {
            console.error(`File not found: ${TRIMMED_CORPUS_PATH}`);
            return;
        }

        const fileContent = fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8");
        console.log("File content length:", fileContent.length);

        const data = JSON.parse(fileContent);
        console.log("Data structure:", Object.keys(data));
        console.log("Number of endpoints:", data.endpoints?.length || 0);
        // Remove the sample endpoint log
    } catch (error) {
        console.error("Error checking corpus:", error);
    }
}

checkCorpus();
