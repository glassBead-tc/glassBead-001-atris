# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Project Overview

Atris is an Audius API integration system using LangGraph.js and Next.js. It processes natural language queries to interact with the Audius API, focusing on trending tracks, playlists, and user profiles.

## Current Functionality

Atris can now:
1. Interpret user queries about Audius data.
2. Extract categories and parameters from queries.
3. Select and interact with appropriate Audius API endpoints.
4. Retrieve and process data for trending tracks, including number parsing for limit queries.
5. Handle basic error scenarios and API rate limiting.

## Development Status

We are currently in Phase 1 of our project roadmap, having completed:
- Basic query pipeline implementation
- Trending tracks functionality
- Number parsing for limit queries

Our next immediate goals are:
1. Implementing playlist search and retrieval
2. Developing user profile search and retrieval
3. Enhancing error handling and system resilience

## Running Atris

To run the project locally:

1. Clone the repository
2. From the project root, run `yarn install`
3. Set up environment variables (see `backend/app/userInstructions/environment_setup.md`)
4. From the command line, run `cd backend && yarn start`

For detailed setup instructions, please refer to the documents in the `backend/app/userInstructions/` folder.

## Key Components

1. Query Processing Pipeline
2. API Interaction Layer
3. Audius-Specific Functionality

## Technology Stack

- Backend: Node.js, TypeScript, LangGraph.js
- API Integration: Axios
- Natural Language Processing: GPT-4 via LangChain
- Frontend (Future): Next.js
- Testing: Jest
- Version Control: Git
- Package Management: Yarn
- Environment Management: dotenv

## Next Steps

1. Implement query routing functionality
2. Expand AudiusApi class with new methods for different query types
3. Develop a custom error handling system
4. Prepare API routes for future Next.js integration
5. Implement playlist and user profile search and retrieval
6. Develop advanced track search capabilities
7. Create a user-friendly CLI interface
8. Implement caching for frequent queries
9. Optimize performance and API call batching
10. Develop comprehensive unit tests

## Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` file for guidelines on how to contribute to this project.

## License

[Add your license information here]

