<!--
   Recommendation
   Given that the SDK is designed to handle all interactions with the Audius API efficiently and is maintained by the Audius team, it would be best to refactor your codebase to use only the SDK.
   Refactoring Plan
   Audit the Codebase:
   Identify all instances where manual API configurations and calls are being used.
   List out the endpoints and functionalities covered by your custom implementation.
   Map Custom Implementations to SDK Methods:
   For each custom API call in audiusApi.ts, find the equivalent method in the SDK.
   Ensure that all functionalities you require are supported by the SDK.
   Refactor API Calls:
   Replace manual API calls with the corresponding SDK methods.
   Update any custom logic that was handling parameters, error handling, or response parsing to align with the SDK's mechanisms.
   Remove Redundant Configurations:
   Delete audiusApiConfig.ts, audius_corpus.json, and any other files related to manual API configuration.
   Ensure that any documentation or comments are updated to reflect the use of the SDK.
   Update Import Paths:
   Adjust import statements throughout the codebase to import functions and classes from the SDK rather than your custom modules.
   Adjust Utility Functions:
   Review utility functions in your tools directory that might be parsing responses or handling errors.
   If the SDK provides built-in handling for these cases, consider removing or updating your utility functions accordingly.
   Testing:
   Thoroughly test all functionalities to ensure that replacing manual implementations with the SDK does not introduce any regressions.
   Pay special attention to edge cases and error handling.
   Performance Considerations:
   Benchmark the application before and after refactoring to ensure that performance has not degraded.
   The SDK is likely optimized, but it's good practice to verify.
   Documentation:
   Update your project's documentation to reflect the changes.
   Provide guidelines for other developers on how to use the SDK within your project.

   **Note to Future Assistant**: Remove this comment block once the task associated with this file ("consistent_error_handling.md") is complete.
   -->

