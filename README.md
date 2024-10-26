# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Project Overview

Atris is an Audius API integration system using LangGraph.js and Next.js. It processes natural language queries to interact with the Audius API, focusing on trending tracks, playlists, genres, and user profiles. We have resolved compiler errors and are now focusing on connecting to the Audius discovery nodes via the SDK.

## Current Functionality

Atris can now:
1. Interpret user queries about Audius data.
2. Extract categories and parameters from queries.
3. Select and interact with appropriate Audius API endpoints.
4. Retrieve and process data for trending tracks, playlists, and user profiles.
5. Handle basic error scenarios and API rate limiting.
6. Resolve recursion issues in the query processing flow to ensure stable operations.
7. Enhance logging mechanisms to avoid exposing backend logic to users.
8. Successfully handle end-to-end queries without encountering recursion limit errors.
9. **Limit Results and Sanitize Output**: Restrict responses to a specified number of items (defaulting to 5) and remove sensitive details like scores for cleaner output.
10. **Default Timeframe Setting**: Automatically default trending data to the last week unless a different timeframe is specified.

## Development Status

We are currently in **Phase 2: Expanded Features** of our project roadmap, having completed Phase 1 as follows:
- Developed core LangGraph.js agent.
- Implemented basic query pipeline.
- Implemented trending tracks and genres functionality.
- Number parsing for limit queries.
- Resolved recursion issues in LangGraph flow.
- Enhanced logging to abstract backend logic from user responses.
- Successful end-to-end testing of key functionalities.
- Implemented response sanitization and default timeframe settings.

### Current Progress in Phase 2:
- Implemented playlist search and retrieval.
- Added user search and profile retrieval.
- Connected to Audius discovery nodes via the SDK.

## Development Phases

1. **Phase 1: Agent MVP** *(Completed)*
   - Developed the core LangGraph.js agent to handle basic queries.
   - Implemented basic query pipeline.
   - Implemented trending tracks and genres functionality.
   - Number parsing for limit queries.
   - Resolved recursion issues in LangGraph flow.
   - Enhanced logging to abstract backend logic from user responses.
   - Successful end-to-end testing of key functionalities.
   - Implemented response sanitization and default timeframe settings.

2. **Phase 2: Expanded Features** *(In Progress)*
   - Implement playlist search and retrieval.
   - Add user search and profile retrieval.
   - Connect to Audius discovery nodes via the SDK.

3. **Phase 3: Advanced Search and CLI Interface** *(Upcoming)*
   - Implement track search functionality with genre and mood filters.
   - Develop a user-friendly CLI interface for interaction.

4. **Phase 4: Optimization and Error Handling** *(Upcoming)*
   - Implement robust error handling and retry mechanisms.
   - Introduce caching for frequently requested data.

5. **Phase 5: Front-end Integration** *(Upcoming)*
   - Create a basic user interface using Next.js for interaction.
   - Develop frontend components to display fetched data.

6. **Phase 6: Design Implementation** *(Upcoming)*
   - Implement detailed design elements and enhance user experience.

7. **Phase 7: Code Cleaning and Documentation** *(Upcoming)*
   - Refine the codebase for efficiency and maintain comprehensive documentation.

8. **Phase 8: Deployment to Production on Vercel** *(Planned)*
   - Deploy the application to production using Vercel for scalability and reliability.

## Next Steps

1. **Phase 2: Expanded Features**
   - Complete user profile search and retrieval.
   - Finalize connection to Audius discovery nodes via the SDK.

2. **Phase 3: Advanced Search and CLI Interface**
   - Implement track search functionality with genre and mood filters.
   - Develop a user-friendly CLI interface for interaction.

3. **Phase 4: Optimization and Error Handling**
   - Implement robust error handling and retry mechanisms.
   - Introduce caching for frequently requested data.

4. **Phase 5: Front-end Integration**
   - Begin frontend development with Next.js.

5. **Additional Goals:**
   - Implement playlist search and retrieval.
   - Develop user profile search and retrieval.
   - Enhance error handling and system resilience.
   - Expand the `AudiusApi` class with new methods for different query types.
   - Implement caching for frequently requested data.

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

- **Backend:** Node.js, TypeScript, LangGraph.js
- **API Integration:** Axios
- **Natural Language Processing:** GPT-4 via LangChain
- **Frontend (Future):** Next.js
- **Testing:** Jest
- **Version Control:** Git
- **Package Management:** Yarn
- **Environment Management:** dotenv

## Error Handling and Logging

The project implements comprehensive error handling and logging:
- **Error Handling:** Each major operation is wrapped in try-catch blocks to capture and manage errors gracefully. User-friendly error messages are generated to provide clear feedback without exposing internal system details.
- **Logging:** Enhanced logging mechanisms ensure that detailed backend processing steps are not exposed to users. Logs are structured to facilitate debugging and monitoring while maintaining abstraction from user-facing components.
- **Recursion Issue Resolution:** Fixed infinite loops in the LangGraph flow by updating `tools.ts`, ensuring that entity queries do not cause recursion limit errors.

## Timeout and Retry Mechanism

- **Timeouts:** Long-running operations are protected by timeouts to prevent indefinite hanging, ensuring that the system remains responsive.
- **Retries:** Certain operations, such as API calls, implement a retry mechanism to handle transient failures, enhancing the robustness of the system.

## Documentation

Comprehensive documentation targeted toward AI ingestion is maintained in the `backend/app/claudeDev_docs/` directory, covering:
- Development progress
- Chain of reasoning for architectural decisions
- Development plans and next steps
- Handoff documents for future maintenance

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.