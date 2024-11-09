# createAtris.ts Refactor

## Objective

Refactor `createAtris.ts` to align with LangChain's best practices, utilizing agents for dynamic tool selection and ensuring proper state management.

## Steps

1. **Update Import Paths:**  
   Ensure all imports are updated to reflect the latest LangChain package structures.

2. **Leverage LangChain Agents:**  
   Replace manual state graph with an agent that dynamically selects and executes tools based on user queries.

3. **Integrate Memory Modules:**  
   Implement memory to maintain conversational context across multi-turn interactions.

4. **Implement Conditional Logic:**  
   Use the agent's capabilities to handle conditional tool execution based on the state.

5. **Enhance Error Handling:**  
   Utilize LangChain's error handling mechanisms within the agent's execution flow.

6. **Testing:**  
   Conduct thorough testing to validate the refactored `createAtris` function's behavior and interaction with other components.

## Status

- [X] Step 1
- [ ] Step 2
- [ ] Step 3
- [ ] Step 4
- [ ] Step 5
- [ ] Step 6

## Challenges

- Migrating from a state graph to an agent-based architecture.
- Ensuring that all tools are correctly registered and accessible by the agent.
- Managing dependencies and ensuring compatibility between tools and the agent.

## Notes

- Refer to LangChain's [Agents documentation](https://js.langchain.com/docs/modules/agents/) for guidance on implementing agents.
- Ensure that the refactored `createAtris` function maintains the original application's functionality while enhancing flexibility and scalability.

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

