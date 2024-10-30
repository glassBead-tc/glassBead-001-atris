# Lessons Learned

1. Importance of LangGraph State Management
   - State is managed by the graph, not individual tools
   - Tools should return only their specific changes
   - Channel reducers are crucial for proper state handling

2. Value of Proper Schema Validation
   - Tool schemas must match LangGraph's expectations
   - State shape consistency is critical between nodes
   - Schema validation helps catch issues early

3. Significance of Comprehensive Logging
   - State transitions need detailed logging
   - Error context is crucial for debugging
   - Log gaps can hide important issues

4. Need for State Reset Mechanisms
   - State bleeding between queries is a common issue
   - Explicit state reset is often necessary
   - Reset should be selective based on needs

5. Importance of Understanding LangGraph Flow
   - Sequential processing, not concurrent
   - State transitions are atomic
   - Edge conditions control flow

6. Value of Error Propagation
   - Errors need proper context
   - Error state should be preserved
   - Recovery mechanisms are important
