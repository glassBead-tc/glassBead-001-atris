# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Functionality

Currently, Atris can:
1. Interpret user queries about Audius data.
2. Select the appropriate API endpoint based on the query.
3. Make requests to the Audius API.
4. Retrieve and format data from the API, specifically for searching tracks.
5. Provide specific answers to queries about track information, such as identifying the artist of a particular track.

The agent now provides targeted responses to queries about specific tracks, including artist information.

## Running Atris

To run the project locally, follow these steps:

1. Clone the repository
2. From the audius-langtool directory, run `yarn install`
3. From the command line, run `cd backend && yarn start`

## Next Steps

- Implement more API endpoints to expand the agent's capabilities.
- Add user input handling for dynamic queries.
- Develop the Next.js UI for a user-friendly interface.
- Improve error handling and edge case management.
- Implement caching mechanisms for frequently requested data.

