# Audius Documentation Agent

A sophisticated AI-powered documentation system for the Audius protocol that dynamically retrieves and synthesizes contextual information.

## Architecture

The agent is built on a research-driven architecture using LangGraph, implementing a directed graph workflow for processing documentation queries:

```
[START] -> [Router] -> [Research] -> [Respond] -> [END]
                   └-> [Clarify] -┘
```

### Components

#### 1. Graph Implementation (`graph.ts`)
- Uses `StateGraph` from LangGraph for workflow management
- Implements a modular, node-based architecture
- Maintains type-safe state management
- Provides flexible routing based on query type

#### 2. Type System (`types.ts`)
- Defines comprehensive type interfaces for:
  - Query classification (`QueryType`)
  - Protocol context (`ProtocolContext`)
  - Router results (`RouterResult`)
  - Research steps (`ResearchStep`)
  - Document references (`DocumentReference`)

#### 3. Node Types
- **Router**: Analyzes and classifies incoming queries
  - Determines query type (PROTOCOL, API, NODE, GOVERNANCE)
  - Extracts protocol context
  - Assigns research priority
  
- **Research**: Generates research strategy
  - Creates step-by-step research plan
  - Retrieves relevant documentation
  - Tracks research progress
  
- **Clarify**: Handles ambiguous queries
  - Requests specific clarification
  - Maintains conversation context
  
- **Respond**: Synthesizes final response
  - Combines research findings
  - Generates contextual response
  - Includes documentation references

### State Management

The agent maintains a comprehensive state through typed channels:
- `messages`: Conversation history
- `messageHistory`: Complete message log
- `router`: Query classification results
- `steps`: Research step tracking
- `documents`: Retrieved documentation
- `confidence`: Response confidence scoring
- `response`: Generated response content
- `debug`: Debugging information

## Usage

```typescript
import { createAudiusAgent } from './graph';

const agent = createAudiusAgent();
const result = await agent.invoke({
  messages: [
    new HumanMessage({
      content: "How do I stake AUD tokens?"
    })
  ]
});
```

## Dependencies

- `@langchain/langgraph`: Graph-based workflow management
- `@langchain/openai`: LLM integration
- `@langchain/core`: Core LangChain functionality
- TypeScript: Type safety and developer experience

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: OpenAI API key
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Development

### Building
```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run type checking
yarn tsc
```

### Testing
```bash
# Run tests (TODO)
yarn test
```

## Future Enhancements

1. Advanced Research Strategies
   - Implement parallel research paths
   - Add priority-based document retrieval
   - Enable cross-reference validation

2. Enhanced Document Retrieval
   - Improve semantic search accuracy
   - Add versioned documentation support
   - Implement caching mechanisms

3. Error Handling
   - Add comprehensive error recovery
   - Implement fallback strategies
   - Add detailed error logging

4. Monitoring
   - Add performance metrics
   - Implement usage analytics
   - Track research effectiveness

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
