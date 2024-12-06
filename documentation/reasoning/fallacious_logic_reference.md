# Fallacious Logic Reference

## State Management Responsibility Fallacy

### Pattern
"If responsibility R moves from component C1, we assume we must explicitly move it to component C2, without verifying if R still needs to be managed explicitly at all."

### Example From Our Code
```typescript
// When we saw this wasn't needed anymore
async (state: GraphState): Promise<Partial<GraphState>>

// We incorrectly assumed we needed this
.addNode("extract_category_node", {
  func: extractCategoryTool,
  config: {
    input_mapper: (state: GraphState) => ({
      query: state.query
    })
  }
})
```

### Core Fallacy
The absence of a need to manually perform a certain task on one side of a relationship between two entities does not necessarily mean we need to do so on the other: there may be built-in means of performing this work abstracted away from us, or we may need to examine the relationship itself more closely.

### Detection
1. When removing responsibility from one component, ask:
   - Does this responsibility need to exist at all?
   - Is it already handled by the framework?
   - Are we making assumptions about where it should go?
   - Have we checked the documentation?

2. Red Flags:
   - Adding new abstractions to "help" the framework
   - Implementing features that seem missing
   - Complex solutions to simple problems
   - Fighting against framework patterns

### Prevention
1. When responsibility shifts:
   - First verify if it needs to exist
   - Check framework documentation
   - Look for built-in solutions
   - Question our assumptions

2. Framework Integration:
   - Trust the framework's design
   - Use built-in features
   - Follow documented patterns
   - Keep solutions simple 