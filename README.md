# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Project Overview

Atris is an Audius API integration system using LangGraph.js and Next.js. It processes natural language queries to interact with the Audius API, focusing on trending tracks, playlists, genres, and user profiles.

## Current Functionality

Atris can now:
1. Interpret user queries about Audius data.
2. Extract categories and parameters from queries.
3. Select and interact with appropriate Audius API endpoints.
4. Retrieve and process data for trending tracks and genres, including number parsing for limit queries.
5. Handle basic error scenarios and API rate limiting.
6. Resolve recursion issues in the query processing flow to ensure stable operations.
7. Enhance logging mechanisms to avoid exposing backend logic to users.
8. Successfully handle end-to-end queries without encountering recursion limit errors.
9. **Limit Results and Sanitize Output**: Restrict responses to a specified number of items (defaulting to 5) and remove sensitive details like scores for cleaner output.
10. **Default Timeframe Setting**: Automatically default trending data to the last week unless a different timeframe is specified.

## Development Status

We are currently in Phase 1 of our project roadmap, having completed:
- Basic query pipeline implementation
- Trending tracks and genres functionality
- Number parsing for limit queries
- Resolved recursion issues in LangGraph flow
- Enhanced logging to abstract backend logic from user responses
- Successful end-to-end testing of key functionalities
- Implemented response sanitization and default timeframe settings

Our next immediate goals are:
1. Implementing playlist search and retrieval
2. Developing user profile search and retrieval
3. Enhancing error handling and system resilience
4. Expanding the `AudiusApi` class with new methods for different query types
5. Implementing caching for frequently requested data

## Running Atris

To run the project locally:

1. Clone the repository
2. From the project root, run `yarn install`
3. Set up environment variables (see `backend/app/userInstructions/environment_setup.md`)
4. From the command line, run `cd backend && yarn start`

For detailed setup instructions, please refer to the documents in the `backend/app/userInstructions/` folder.

## Key Components

1. **Query Processing Pipeline**
2. **API Interaction Layer**
3. **Audius-Specific Functionality**
4. **Error Handling and Logging**
5. **Graph Structure for Query Routing**
6. **Response Sanitization and Formatting**

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
2. Expand `AudiusApi` class with new methods for different query types
3. Develop a custom error handling system
4. Prepare API routes for future Next.js integration
5. Implement playlist and user profile search and retrieval
6. Develop advanced track search capabilities
7. Create a user-friendly CLI interface
8. Implement caching for frequent queries
9. Optimize performance and API call batching
10. Develop comprehensive unit tests
11. Enhance logging to further abstract backend processes from user interfaces
12. Improve handling of complex and multi-step queries
13. Expand documentation to cover new features and components

## Error Handling and Logging

The project implements comprehensive error handling and logging:
- **Error Handling**: Each major operation is wrapped in try-catch blocks to capture and manage errors gracefully. User-friendly error messages are generated to provide clear feedback without exposing internal system details.
- **Logging**: Enhanced logging mechanisms ensure that detailed backend processing steps are not exposed to users. Logs are structured to facilitate debugging and monitoring while maintaining abstraction from user-facing components.
- **Recursion Issue Resolution**: Fixed infinite loops in the LangGraph flow by updating `createGraph.ts`, ensuring that entity queries do not cause recursion limit errors.

## Timeout and Retry Mechanism

- **Timeouts**: Long-running operations are protected by timeouts to prevent indefinite hanging, ensuring that the system remains responsive.
- **Retries**: Certain operations, such as API calls, implement a retry mechanism to handle transient failures, enhancing the robustness of the system.

## Documentation

Comprehensive documentation targeted toward AI ingestion is maintained in the `backend/app/claudeDev_docs/` directory, covering:
- Development progress
- Chain of reasoning for architectural decisions
- Development plans and next steps
- Handoff documents for future maintenance

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.