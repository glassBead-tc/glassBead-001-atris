// backend/src/app/tools/schemas.ts
import { z } from "zod";

// Define DatasetSchema Schema
export const DatasetSchemaSchema = z.object({
  id: z.string(),
  category_name: z.string(),
  tool_name: z.string(),
  api_name: z.string(),
  api_description: z.string(),
  required_parameters: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      default: z.string(),
    })
  ),
  optional_parameters: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      default: z.string(),
    })
  ),
  method: z.string(),
  template_response: z.record(z.any()).optional(),
  api_url: z.string(),
  parameters: z.record(z.any()).optional(),
  default_parameters: z.record(z.any()).optional(),
});

// Define ExtractCategory Schema
export const ExtractCategorySchema = z.object({
  query: z.string().nonempty("Query cannot be empty"),
});

// Define ExtractParameters Schema
export const ExtractParametersSchema = z.object({
  parameters: z.array(z.string()).nonempty("Parameters array cannot be empty"),
});

// Define RequestParameters Schema
export const RequestParametersSchema = z.object({
  missingParams: z.array(z.string()).nonempty("Missing parameters array cannot be empty"),
});

// Define GraphState Schema
export const GraphStateSchema = z.object({
  llm: z.any().nullable(),
  query: z.string().nullable(),
  queryType: z.string().nullable(),
  categories: z.array(z.string()).nullable(),
  apis: z.array(DatasetSchemaSchema).nullable(),
  bestApi: DatasetSchemaSchema.nullable(),
  params: z.record(z.string()).nullable(),
  response: z.record(z.any()).nullable(),
  complexity: z.enum(['simple', 'moderate', 'complex']).nullable(),
  isEntityQuery: z.boolean(),
  entityName: z.string().nullable(),
  entity: z.any().nullable(),
  parameters: z.record(z.any()).nullable(),
  secondaryApi: DatasetSchemaSchema.nullable(),
  secondaryResponse: z.any().nullable(),
  multiStepHandled: z.boolean(),
  initialState: z.any().nullable(),
  formattedResponse: z.string().nullable(),
  message: z.string().nullable(),
  entityType: z.enum(['user', 'playlist', 'track']).nullable(),
  stateMessages: z.array(z.string()).nullable(),
  error: z.boolean(), // Ensure 'error' is included and correctly typed
});
