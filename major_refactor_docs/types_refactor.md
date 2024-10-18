# Types Refactor

## Objective

Refactor `types.ts` to utilize `Partial<GraphState>` in tool return types and align with LangChain's type definitions.

## Steps

1. **Update `GraphState` Interface:**  
   - Mark optional properties with `?` to allow for partial updates.
   - Example:     ```typescript
     export interface GraphState {
       llm: ChatOpenAI<ChatOpenAICallOptions>;
       query: string;
       queryType: QueryType;
       categories: [string, ...string[]];
       apis: DatasetSchema[];
       bestApi?: DatasetSchema | null;
       secondaryApi?: DatasetSchema | null;
       params?: {
         apiUrl?: string;
         timeframe?: string;
         limit?: number;
         track?: string;
         user?: string;
         artist?: string;
         // Add any other parameters you might need
       };
       response?: any;
       secondaryResponse?: any | null;
       error?: boolean;
       formattedResponse?: string | null;
       message?: string | null;
       isEntityQuery?: boolean;
       entityName?: string | null;
       entity?: Entity | null;
       parameters?: { [key: string]: any } | null;
       complexity: ComplexityLevel;
       multiStepHandled?: boolean;
       initialState?: GraphState | null;
       entityType?: 'user' | 'playlist' | 'track' | null;
     }     ```
   
2. **Implement Type Guards:**  
   - Ensure that type guards like `isUserData`, `isTrackData`, and `isPlaylistData` are correctly defined to assist TypeScript in type checking.

3. **Review and Update Related Interfaces:**  
   - Verify that all related interfaces (`QueryClassification`, `DatasetSchema`, etc.) are accurately defined and aligned with the refactored `GraphState`.

4. **Testing:**  
   - Validate that TypeScript no longer reports errors related to missing `GraphState` properties.
   - Ensure that tools correctly accept and return the updated types.

## Status

- [X] Step 1
- [ ] Step 2
- [ ] Step 3
- [ ] Step 4

## Challenges

- Managing dependencies between different type definitions.
- Ensuring consistency across all tools and modules after type changes.

## Notes

- Consider centralizing type definitions if they are scattered across multiple files.
- Use TypeScript's `Partial` utility type to simplify type annotations where appropriate.

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
