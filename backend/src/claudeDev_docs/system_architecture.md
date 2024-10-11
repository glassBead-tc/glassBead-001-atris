# System Architecture

## High-Level Overview


## Component Details

1. Query Processing
   - Extract Category: Determines the type of query (e.g., tracks, playlists)
   - Get APIs: Retrieves relevant API endpoints
   - Select API: Chooses the most appropriate API
   - Extract Parameters: Parses query for API parameters

2. API Interaction
   - Create Fetch Request: Prepares the API call
   - Process API Response: Handles the raw API response

3. Response Formatting
   - Formats API data into user-friendly responses

4. User Interface
   - CLI: Command-line interface for interacting with the system
   - Web (Future): Next.js based web interface

## Data Flow
1. User input -> Extract Category
2. Extract Category -> Get APIs -> Select API
3. Select API -> Extract Parameters -> Create Fetch Request
4. Create Fetch Request -> Audius API -> Process API Response
5. Process API Response -> Response Formatting -> User Interface