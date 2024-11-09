# Refactor Overview

## Objectives

- **Update Tools:** Refactor all tools to return `Partial<GraphState>` instead of the full `GraphState`.
- **Leverage Agents:** Utilize LangChain Agents to enable dynamic tool invocation based on user queries.
- **Structured Prompts:** Implement `ChatPromptTemplate` for creating structured and effective prompts.
- **Conversational Memory:** Incorporate memory modules to maintain context in multi-turn interactions.
- **Modern Imports:** Update all import statements to align with the latest LangChain package structures.

## Goals

- **Modularity:** Enhance the modularity and maintainability of the codebase.
- **Type Safety:** Improve TypeScript type safety to prevent runtime errors.
- **Efficiency:** Streamline the tool execution flow for better performance.
- **Best Practices:** Align the application with LangChain's best practices for scalability and robustness.

## Progress

- [X] Defined refactor objectives.
- [X] Assigned tasks to team members.
- [ ] Created documentation templates.
- [ ] Began tool-specific refactoring.
- [ ] Updated TypeScript definitions.
- [ ] Integrated LangChain Agents.

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

