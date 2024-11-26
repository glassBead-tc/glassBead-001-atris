# Audius Documentation Retrieval Agent Implementation Plan

## Overview
Implementation of a CRAG-based retrieval agent for handling non-entity queries about Audius documentation. This agent will be integrated into the existing graph-based query handling system.

## Components

### 1. Documentation Structure
- Created `audius_docs.json` with categorized URLs
- Categories include: overview, api, sdk, architecture, guides, and specific api endpoints
- Structure allows for quick topic-based relevance matching

### 2. Entity Detection Enhancement
Location: `backend/src/app/tools/utils/queryAnalysis.ts`

Add technical keywords for non-entity query detection:
```typescript
const technicalKeywords = [
  // API-related
  "endpoint", "api", "request", "response", "authentication",
  // SDK-related
  "sdk", "implementation", "integration", "initialize",
  // Protocol-related
  "node", "architecture", "protocol", "network",
  // Development-related
  "implement", "develop", "build", "create"
];
```

### 3. Retrieval Subgraph Implementation
Location: `backend/src/app/graphs/retrieval_graph.ts`

#### State Interface
```typescript
interface RetrievalState {
  query: string;
  urls: string[];
  relevantDocs: Document[];
  grade: number;
  response: string;
  fallbackUsed: boolean;
}
```

#### Nodes
1. `url_selector_node`
   - Input: query
   - Output: most relevant documentation URLs
   - Uses: embeddings to match query with doc categories

2. `retriever_node`
   - Input: URLs
   - Output: retrieved and processed content
   - Uses: web scraping or cached content

3. `grader_node`
   - Input: retrieved content
   - Output: binary relevance grade (0 or 1)
   - Uses: LLM to assess relevance

4. `generator_node`
   - Input: graded content
   - Output: final response
   - Uses: LLM to generate user-friendly response

5. `fallback_node`
   - Input: query
   - Output: Tavily search results
   - Triggered when: no relevant docs found

#### Graph Flow
```
query -> url_selector -> retriever -> grader
                                      |
                    (if grade = 0) -> fallback
                                      |
                    (either path) -> generator -> response
```

### 4. Parent Graph Integration
Location: `backend/src/app/index.ts`

#### New Edge Logic
```typescript
.addConditionalEdges(
  "extract_category_node",
  async (state: GraphState) => {
    if (!state.isEntityQuery) {
      return "retrieval_node";
    }
    return "select_api_node";
  }
)
```

### 5. Error Handling

#### Types of Errors
1. Timeout Errors
   - Message: "Request timed out. Please try again or rephrase your question."
   - Action: Return to user immediately

2. No Relevant Docs
   - Message: "I couldn't find specific documentation about that. Could you try rephrasing your question?"
   - Action: Attempt Tavily fallback

3. Fallback Failure
   - Message: "I encountered an error processing your request. Please try again."
   - Action: Log error, return to user

### 6. Implementation Order

1. Phase 1: Core Infrastructure ✓
   - Enhance entity detection ✓
     - Added technical keywords for non-entity detection
     - Improved context-aware entity detection
     - Added isTechnicalQuery field to interface
   - Set up retrieval graph structure
   - Implement URL selector

2. Phase 2: Content Processing
   - Implement retriever node
   - Implement grader node
   - Basic response generation

3. Phase 3: Integration
   - Connect to parent graph
   - Add fallback mechanism
   - Error handling

4. Phase 4: Optimization
   - Response quality improvements
   - Performance optimization
   - Edge case handling

## Notes
- All LLM calls should use existing chat models and configurations
- Maintain existing error handling patterns
- Keep response generation consistent with current system
- Focus on accurate entity vs non-entity classification
