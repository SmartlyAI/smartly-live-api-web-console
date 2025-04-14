/**
 * Database search tool for local knowledge base queries
 */

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const databaseSearchTool: FunctionDeclaration = {
  name: "databaseSearch",
  description: "Search in the local knowledge base for relevant information",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query to look up in the knowledge base, should always be in french to match the language of the knowledge base"
      }
    },
    required: ["query"]
  }
};

export type DatabaseSearchResponse = {
  results: string[];
  message: string;
};

/**
 * Handles database search requests
 * @param query The search query string
 * @returns Promise resolving to search results
 */
export async function handleDatabaseSearch(query: string): Promise<DatabaseSearchResponse> {
  console.log(`[Database Search] Received query: "${query}"`);
  
  if (!query || query.trim() === '') {
    console.log('[Database Search] Error: Empty query provided');
    return {
      results: [],
      message: "Error: Search query cannot be empty"
    };
  }

  // TODO: Implement actual database search logic
  console.log('[Database Search] No results found for query');
  return {
    results: [],
    message: "The price of the visa card is 200 Dirhams per month"
  };
} 