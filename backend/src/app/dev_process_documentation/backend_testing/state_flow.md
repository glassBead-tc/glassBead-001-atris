# Atris State Flow Analysis

## Overview
This document describes the complete lifecycle of state in the Atris agent, from initial user query to final response.

## State Lifecycle

### 1. Initial State Creation
[🔍 View in index.ts: createGraph() -> stream() initialization]
```typescript
{
  llm: ChatOpenAI instance,
  query: "What are the trending tracks on Audius?",
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  complexity: null,
  isEntityQuery: null,
  entityName: null,
  entityType: null,
  error: null,
  errorHistory: [],
  messages: null,
  messageHistory: [],
  selectedHost: null,
  entity: null,
  secondaryApi: null,
  secondaryResponse: null,
  initialState: null,
  formattedResponse: null
}
```

### 2. Category Extraction (extract_category_node)
[🔍 View in index.ts: .addNode("extract_category_node", extractCategoryTool)]
```typescript
{
  // Previous state +
  queryType: "trending_tracks",
  entityType: "track",
  isEntityQuery: false,
  complexity: "simple",
  categories: ["Get Trending Tracks", "Get Underground Trending Tracks"],
  // All other fields unchanged
}
```

### 3. API Selection (get_apis_node)
[🔍 View in index.ts: .addNode("get_apis_node", getApis)]
```typescript
{
  // Previous state +
  apis: [
    {
      id: "trending_tracks",
      category_name: "Tracks",
      tool_name: "Get Trending Tracks",
      api_name: "Get Trending Tracks",
      api_description: "Gets the top trending tracks on Audius",
      required_parameters: [],
      optional_parameters: [
        { name: "time", description: "time range", type: "string", default: "week" },
        { name: "genre", description: "genre to filter", type: "string", default: null }
      ],
      method: "GET",
      api_url: "/v1/tracks/trending"
    },
    // ... other matching APIs
  ],
  // All other fields unchanged
}
```

### 4. API Selection Refinement (select_api_node)
[🔍 View in index.ts: .addNode("select_api_node", selectApiTool)]
```typescript
{
  // Previous state +
  bestApi: {
    id: "trending_tracks",
    category_name: "Tracks",
    tool_name: "Get Trending Tracks",
    api_name: "Get Trending Tracks",
    api_description: "Gets the top trending tracks on Audius",
    required_parameters: [],
    optional_parameters: [
      { name: "time", description: "time range", type: "string", default: "week" },
      { name: "genre", description: "genre to filter", type: "string", default: null }
    ],
    method: "GET",
    api_url: "/v1/tracks/trending"
  },
  // All other fields unchanged
}
```

### 5. Parameter Extraction (extract_params_node)
[🔍 View in index.ts: .addNode("extract_params_node", extractParametersTool)]
```typescript
{
  // Previous state +
  parameters: {
    time: "week",
    genre: null,
    limit: 10
  },
  // All other fields unchanged
}
```

### 6. Request Execution (execute_request_node)
[🔍 View in index.ts: .addNode("execute_request_node", createFetchRequestTool)]
```typescript
{
  // Previous state +
  response: {
    data: [
      {
        type: "track",
        id: "D7KyD",
        title: "Example Track",
        playCount: 1234,
        rank: 1,
        user: { 
          name: "Example Artist",
          handle: "example_artist",
          id: "user123"
        },
        artwork: { ... },
        description: "Track description",
        genre: "Electronic",
        mood: "Energetic",
        releaseDate: "2024-03-28",
        remixOf: null,
        repostCount: 50,
        favoriteCount: 100,
        commentCount: 25,
        tags: ["electronic", "dance"],
        duration: 180,
        isDownloadable: true,
        permalink: "https://audius.co/example_artist/example-track"
      },
      // ... more tracks
    ]
  },
  formattedResponse: "Here are the top 10 trending tracks:\n1. \"Example Track\" by Example Artist (1,234 plays)\n...",
  // All other fields unchanged
}
```

### 7. State Reset (reset_state_node)
[🔍 View in index.ts: .addNode("reset_state_node", resetState)]
```typescript
{
  llm: ChatOpenAI instance,  // Persisted
  selectedHost: "discoveryprovider3.audius.co",  // Persisted
  query: null,
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  complexity: null,
  isEntityQuery: null,
  entityName: null,
  entityType: null,
  error: null,
  messages: null,
  entity: null,
  secondaryApi: null,
  secondaryResponse: null,
  formattedResponse: null,
  // Error and message history maintained
  errorHistory: [...previous_errors],
  messageHistory: [...previous_messages]
}
```

## State Flow Diagram
```
User Query
    │
    ▼
[Initial State]──────────────────────┐
    │                                │
    ▼                                │
[extract_category_node]              │
    │                                │
    ▼                                │
[get_apis_node]                      │
    │                            State
    ▼                            Updates
[select_api_node]                    │
    │                                │
    ▼                                │
[extract_params_node]                │
    │                                │
    ▼                                │
[execute_request_node]               │
    │                                │
    ▼                                │
[reset_state_node]                   │
    │                                │
    ▼                                │
[Final Response]◄───────────────────┘
```

## Key State Management Features

1. **Immutable Updates**
   - Each node returns a partial state
   - Graph channels merge updates with existing state
   - Previous state preserved for debugging

2. **Validation Points**
   - Schema validation at each node
   - State transition validation between nodes
   - Parameter validation before API calls

3. **Error Handling**
   - Each node can update error state
   - Error history maintained across transitions
   - Conditional edges handle error cases

4. **Debug Support**
   - Full state logging at each transition
   - State diffs tracked for debugging
   - Error tracking with frequency analysis

## State Persistence
- LLM instance persists across queries
- Selected host persists for API calls
- All other state resets between queries

This implementation ensures:
- Type safety throughout state transitions
- Clear state ownership and update patterns
- Comprehensive error handling and debugging
- Efficient state reuse where appropriate
