import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API Key is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OpenRouter API Key is required"),
  // Add other sensitive variables here
});

// For client-side env vars (prefix with NEXT_PUBLIC_)
const publicEnvSchema = z.object({
  NEXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
  // Add other public variables here
});

// Server-side: full validation
export const getServerConfig = () => {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
};

// Client-side: only validate public variables
export const getClientConfig = () => {
  const parsed = publicEnvSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error(
      "❌ Invalid public environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid public environment variables");
  }

  return parsed.data;
};

// Type inference
export type ServerConfig = z.infer<typeof envSchema>;
export type ClientConfig = z.infer<typeof publicEnvSchema>;
