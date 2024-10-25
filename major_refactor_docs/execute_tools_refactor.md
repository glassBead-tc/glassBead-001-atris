# executeTools Refactor

## Objective

Refactor `executeTools.ts` to align with LangChain's best practices, leveraging agents for dynamic tool invocation and correctly merging partial `GraphState` updates.

## Steps

1. **Leverage LangChain Agents:**  
   Implement LangChain's Agent framework to enable dynamic selection and execution of tools based on user queries.

2. **Merge Partial States:**  
   Ensure that each tool's partial state (`Partial<GraphState>`) is correctly merged into the overall `GraphState`.

3. **Implement Error Handling:**  
   Utilize LangChain's built-in error handling mechanisms to manage tool execution failures gracefully.

4. **Refactor Tool Invocation Order:**  
   Allow the Agent to determine the sequence of tool executions rather than hardcoding the order.

5. **Update TypeScript Definitions:**  
   Ensure that `executeTools.ts` correctly handles `Partial<GraphState>` and updates the state accordingly.

6. **Testing:**  
   Write comprehensive unit and integration tests to verify the updated execution flow.

## Status

- [X] Step 1
- [ ] Step 2
- [ ] Step 3
- [ ] Step 4
- [ ] Step 5
- [ ] Step 6

## Challenges

- Integrating agents into the existing state management flow.
- Ensuring that all tools work seamlessly when invoked dynamically by the Agent.

## Notes

- Review LangChain's [Agents documentation](https://js.langchain.com/docs/modules/agents/) for implementation details.
- Coordinate with the tool refactoring to maintain consistent state updates.

## Directory Structure/Order of Operations

major_refactor_docs/
├── overview.md  (1)
├── tools/
│   ├── get_apis_tool_refactor.md  (2)
│   ├── extract_category_tool_refactor.md  (3)
│   ├── extract_parameters_tool_refactor.md  (4)
│   └── classify_query_tool_refactor.md  (5)
├── execute_tools_refactor.md  (6)
├── types_refactor.md  (7)
├── index_refactor.md  (8)
└── graph/
    └── create_atris_refactor.md  (9)

