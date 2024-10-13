# Audius API Integration Backend

This is the backend for the Audius API integration project. It handles query processing, API interactions, and serves as the core logic for the Audius integration ecosystem.

## Recent Changes

1. Fixed mock implementation in `app/__tests__/test/createGraph.test.ts` to resolve type conflicts with jest mocks.
2. Addressed the missing `getTestQueries` function in `app/index.ts` by defining it directly in the file.
3. Corrected the asynchronous function call in `app/modules/test_query_classifier.ts` by properly awaiting the `classifyQuery` function.

These changes resolved TypeScript compilation issues and improved the overall stability of the project.

## Building the Project

To build the project, run the following command in the backend directory:

```
yarn build
```

This will compile the TypeScript files and prepare the project for execution.

## Running the Project

After building, you can start the backend server by running:

```
yarn start
```

## Testing

To run the tests, use the following command:

```
yarn test
```

## Project Structure

- `app/`: Contains the main application code
  - `modules/`: Core logic modules
  - `services/`: External service integrations
  - `tools/`: Utility functions and tools
  - `types.ts`: TypeScript type definitions
- `__tests__/`: Test files

## Contributing

When contributing to this project, please ensure that all TypeScript files compile without errors and that all tests pass before submitting a pull request.
