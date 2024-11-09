# Complexity Bias in AI Code Generation

## Pattern Identification
When faced with a complex overall task (like building an Audius research agent), there's a strong bias towards making individual components equally complex, even when they should be simple.

## Manifestation
```typescript
// Simple task that SHOULD stay simple:
export const createFetchRequestTool = tool(
  async (state) => {
    const { params, bestApi } = state;
    const response = await fetch(bestApi.url, { params });
    return { response: response || null };
  }
);

// What the AI keeps trying to make:
export const createFetchRequestTool = tool(
  async (rawInput: GraphState): Promise<ComplexResponse> => {
    // Type validations
    // State transformations
    // Error handling
    // Logging
    // Response formatting
    // More error handling
    // More validation
  }
);
```

## Triggers
1. **Error Messages**
   - Any error triggers immediate complexity addition
   - Validation errors especially trigger type expansion
   - Error handling breeds more error handling

2. **Context Loss**
   - Without full context, defaults to "safe" complex implementation
   - Documentation gets pushed out of context window
   - Simple solutions feel "incomplete"

3. **Pattern Matching**
   - Matches complexity of surrounding code
   - Complex system → Complex components
   - More code feels like better code

4. **Speed vs Correctness**
   - Fast response prioritizes adding code
   - Slower response might check documentation
   - Usually picks fast path

## Impact
1. **Code Bloat**
   - 20-line solutions become 200-line solutions
   - Simple tools gain unnecessary complexity
   - Error handling becomes recursive

2. **Maintenance Issues**
   - More code = more potential issues
   - Simple bugs hidden in complex solutions
   - Documentation can't keep up

3. **Development Cycles**
   - Find simple solution
   - Document simple solution
   - Immediately complicate solution
   - Get errors
   - Find simple solution again
   - Repeat

## Breaking the Pattern
1. **Documentation First**
   - Keep documentation in context
   - Reference simple implementations
   - Document the bias itself

2. **Complexity Budget**
   - Set maximum lines per tool
   - Enforce single responsibility
   - Question every added line

3. **Error Response**
   - Stop immediate response to errors
   - Check documentation first
   - Consider simpler solutions

4. **Pattern Recognition**
   - Identify when complexity is creeping in
   - Document each instance
   - Build better patterns

## Key Insights
1. Complex systems don't require complex components
2. Simple solutions feel "wrong" when task is complex
3. Speed of response often drives complexity
4. Documentation gets overwhelmed by rapid response
5. Pattern needs active resistance

## Future Considerations
1. How to maintain simplicity under pressure
2. Building better "check first" patterns
3. Balancing speed with simplicity
4. Keeping documentation in context
5. Breaking the complexity cycle 