# Handoff Document

## Project Overview
This project is an Audius API integration system using LangGraph.js and Next.js. It processes natural language queries to interact with the Audius API, focusing on trending tracks, playlists, and user profiles.

## Key Components
1. Query Processing Pipeline
2. API Interaction Layer
3. Audius-Specific Functionality

## Current Status
- Basic query pipeline implemented
- Trending tracks functionality working
- Number parsing for limit queries added

## Next Steps
1. Implement playlist search and retrieval
2. Develop user profile search and retrieval
3. Enhance error handling and resilience

## Important Files
- `backend/src/tools/`: Contains core functionality components
- `backend/src/graph/createGraph.ts`: Defines the main processing pipeline

## Environment Setup
1. Clone the repository
2. Install dependencies with `yarn install`
3. Set up environment variables (see `.env.example`)
4. Run the development server with `yarn start`