# GetApisTool Refactor

## Objective

Refactor `GetApisTool.ts` to return `Partial<GraphState>` and align with LangChain's tool execution patterns.

## Steps

1. **Change Return Type:**  
   Update the return type from `Promise<GraphState>` to `Promise<Partial<GraphState>>`.

2. **Modify `_call` Method:**  
   Ensure the `_call` method returns only the properties it modifies (`apis`, `error`, `message`).

3. **Remove State Spreading:**  
   Avoid returning the entire state within the tool. Instead, return only the necessary partial state.

4. **Update TypeScript Definitions:**  
   Ensure that the schema in `GetApisTool` reflects only the required input properties.

5. **Testing:**  
   Write unit tests to verify that `GetApisTool` returns the correct partial state.

## Status

- [X] Step 1
- [X] Step 2
- [X] Step 3
- [ ] Step 4
- [ ] Step 5

## Challenges

- Ensuring that all necessary properties are correctly updated without affecting unrelated parts of the state.

## Notes

- After refactoring, verify that no TypeScript errors related to missing `GraphState` properties occur during compilation.
- Coordinate with other refactoring tasks to maintain consistency.

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

