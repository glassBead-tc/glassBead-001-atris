# Development Heuristics

## Tooling Heuristics

### LangGraph
1. **State Management Principle**
   > "LangGraph's key contribution is abstracting away state management through strict rules that eliminate concerns about mutable vs. immutable state and schema validation. Think of it as Redux for agent state instead of component state."

   - Let the framework handle state distribution
   - Keep tools focused on their specific logic
   - Trust the built-in validation
   - Don't fight the framework's patterns

## Process Heuristics

### Workflow
1. **Framework Integration Pattern**
   > "Start by understanding the framework's capabilities and design philosophy, then align our implementation with those patterns rather than fighting against them."

   Steps:
   - Study framework source code
   - Review official examples
   - Question our assumptions
   - Look for built-in solutions
   - Trust framework features
   - Keep implementations simple
   - Document working patterns 