# Refactoring API Calls to Utilize the Audius SDK

## Overview

To streamline the codebase and leverage the capabilities of the Audius SDK, we will refactor our tools to replace manual API calls with SDK methods. This will improve maintainability, ensure consistency, and reduce code complexity.

## Refactoring Plan

### 1. Remove Manual API Calls

- **Action**: Eliminate the `callAudiusAPI` function from `tools.ts`.
- **Reason**: The SDK provides methods for all necessary API interactions, making manual `fetch` calls unnecessary.

### 2. Update `createFetchRequest` Function

- **Action**: Replace `createFetchRequest` with a new function, `executeSdkRequest`, that uses the SDK.
- **Code Changes**:
  ```typescript
  export async function executeSdkRequest(state: GraphState): Promise<Partial<GraphState>> {
    const { bestApi, parameters } = state;

    if (!bestApi) {
      throw new Error("No best API found");
    }

    try {
      let response;

      if (bestApi.api_name === 'Get Track') {
        const trackId = parameters?.track_id;
        if (!trackId) {
          throw new Error("Track ID is required");
        }
        response = await sdk.tracks.getTrack({ trackId });
      }
      // Handle other API endpoints...

      return { response: response.data };
    } catch (error) {
      console.error('Error in executeSdkRequest:', error);
      throw error;
    }
  }  ```

### 3. Simplify Parameter Extraction

- **Action**: Modify `extractParameters` to map extracted data directly to SDK method parameters.

### 4. Adjust `selectApi` Function

- **Action**: Update `selectApi` to map user queries directly to SDK methods rather than selecting from a list of APIs.

### 5. Update Type Definitions

- **Action**: Use types from the Audius SDK in `types.ts` where appropriate.

### 6. Reorganize Tools

- **Action**: Group tools in `tools.ts` based on SDK modules (`tracks`, `users`, `playlists`) for better organization.

## Benefits

- **Reduced Complexity**: By utilizing the SDK, we eliminate the need for manual API endpoint management.
- **Improved Reliability**: SDK methods are maintained by Audius and handle underlying API changes.
- **Easier Maintenance**: Future updates can focus on higher-level logic rather than low-level API interactions.

## Next Steps

- **Testing**: Thoroughly test all functionalities to ensure the refactored code works as expected.
- **Documentation**: Update any documentation to reflect the changes made.
- **Code Cleanup**: Remove any unused code and ensure all modules are properly imported.
