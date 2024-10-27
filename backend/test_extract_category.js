import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { classifyQuery } from './app/modules/queryClassifier.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Script started');

const logFile = path.join(process.cwd(), 'test_output.log');
console.log('Log file path:', logFile);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message); // Also log to console
}

try {
  log('Current working directory: ' + process.cwd());
  log('Contents of current directory: ' + fs.readdirSync(process.cwd()).join(', '));

  const modulesPath = path.join(process.cwd(), 'backend', 'app', 'modules');
  log('Contents of backend/app/modules: ' + fs.readdirSync(modulesPath).join(', '));

  async function testQueryClassification() {
    log("Starting query classification test...");

    const testQueries = [
      { query: "What are the top trending tracks on Audius right now?", expectedType: "trending_tracks" },
      { query: "Tell me about the user RAC on Audius", expectedType: "user_info", expectedEntity: "user" },
      { query: "How many plays does the track 'Crypto Boy' by Yung Beef have?", expectedType: "track_info", expectedEntity: "track" },
      { query: "Can you list the tracks in the playlist 'Summer Hits 2023'?", expectedType: "playlist_info", expectedEntity: "playlist" },
      { query: "What genres are trending on Audius this week?", expectedType: "general" },
    ];

    for (const test of testQueries) {
      try {
        log(`\nTesting query: "${test.query}"`);
        const result = await classifyQuery(test.query);
        log(`Classification result: ${JSON.stringify(result, null, 2)}`);
        log(`Expected type: ${test.expectedType}, Actual type: ${result.type}`);
        if (test.expectedEntity) {
          log(`Expected entity type: ${test.expectedEntity}, Actual entity type: ${result.entityType}`);
        }
        log(`Is entity query: ${result.isEntityQuery}`);
      } catch (error) {
        log(`Error classifying query "${test.query}": ${error}`);
        console.error(error); // Log the full error object
      }
    }

    log("\nQuery classification test completed.");
  }

  // Run the test
  console.log('Starting test execution');
  await testQueryClassification();

} catch (error) {
  log(`An error occurred during script execution: ${error}`);
  console.error('Script execution error:', error); // Log the full error object
}

// Add this line to keep the Node.js process running until all promises are resolved
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error('Unhandled Rejection:', reason); // Log the full reason object
});

log('Test script execution completed.');

// Check if the log file exists after execution
setTimeout(() => {
  if (fs.existsSync(logFile)) {
    console.log(`Log file created successfully at: ${logFile}`);
    console.log('Log file contents:');
    console.log(fs.readFileSync(logFile, 'utf8'));
  } else {
    console.error(`Log file not found at: ${logFile}`);
  }
}, 1000); // Wait for 1 second to ensure all async operations are completed

console.log('Script ended');
