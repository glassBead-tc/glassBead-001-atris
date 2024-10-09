# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Functionality

Currently, Atris can:
1. Interpret user queries about Audius data.
2. Select the appropriate API endpoint based on the query.
3. Make requests to the Audius API.
4. Retrieve and format data from the API for tracks, playlists, and trending content.
5. Provide specific answers to queries about track information, playlist details, and trending tracks.

The agent now provides targeted responses to a variety of queries, including track searches, playlist information, and trending content. The output formatting has been refined to match the expected answer format.

## Running Atris

To run the project locally, follow these steps:

1. Clone the repository
2. From the audius-langtool directory, run `yarn install`
3. From the command line, run `cd backend && yarn start`

## Next Steps

- Continue to improve error handling for failed queries and API responses.
- Implement user input handling for dynamic queries.
- Add more detailed information in the formatted output when appropriate.
- Develop the Next.js UI for a user-friendly interface.
- Implement caching mechanisms for frequently requested data.
- Address the deprecation warning for the `punycode` module.
- Expand the test suite to cover more edge cases and ensure consistent output.

