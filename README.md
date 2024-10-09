# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Functionality

Currently, Atris can:
1. Interpret user queries about Audius data.
2. Select the appropriate API endpoint based on the query.
3. Make requests to the Audius API.
4. Retrieve data from the API for tracks, playlists, and trending content.
5. Provide specific answers to queries about track information, playlist details, and trending tracks.

However, there are currently issues with API connectivity and response handling that need to be addressed.

## Running Atris

To run the project locally, follow these steps:

1. Clone the repository
2. From the audius-langtool directory, run `yarn install`
3. From the command line, run `cd backend && yarn start`

## Current Issues

- API connectivity problems: The agent is unable to successfully connect to the Audius API.
- Error handling: There are issues with processing API responses and handling errors.
- Query processing: The agent is failing to select appropriate APIs for user queries.

## Next Steps

- Debug and fix API connectivity issues.
- Improve error handling for failed queries and API responses.
- Fix the API selection process in the `select_api.ts` file.
- Implement proper response parsing for successful API calls.
- Continue to refine the query interpretation and response generation.
- Implement user input handling for dynamic queries.
- Develop the Next.js UI for a user-friendly interface.
- Implement caching mechanisms for frequently requested data.
- Address the deprecation warning for the `punycode` module.
- Expand the test suite to cover more edge cases and ensure consistent output.

