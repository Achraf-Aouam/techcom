require("dotenv").config({ path: "./.env.local" });
const { URL } = require("url");

// Using the URL constructor is more robust for path resolution,
// especially on Windows environments. It prevents misinterpreting 'http:' as a drive letter.
const openapiUrl = new URL("/openapi.json", process.env.NEXT_PUBLIC_API_URL)
  .href;

module.exports = {
  "api-generation": {
    input: {
      // Use the environment variable for the target
      target: "openapi.json",
    },
    output: {
      // We want to use axios as the client
      client: "axios",
      // We want to split the files by tags (user, products, etc.)
      mode: "tags-split",
      // The output directory for the generated files
      target: "backend/endpoints",
      // Generate both TypeScript types and Zod schemas
      schemas: "backend/schemas",
      // Use a custom transformer to change the file names
      override: {
        // This creates Zod schemas for all schemas defined in the backend
        zod: {
          schemas: true, // Generate zod schemas
          requests: false, // Do not generate zod schemas for request bodies
          responses: false, // Do not generate zod schemas for responses
        },
        // Transformer to rename the generated files
        transformer: (verb) => {
          // This will change the generated file names to be more descriptive
          // e.g. instead of `user.ts` it will be `user.msw.ts`
          return {
            ...verb,
            // The name of the generated file
            name: `${verb.name}.msw.ts`,
          };
        },
      },
    },
  },
};
