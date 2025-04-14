/**
 * Database search tool for local knowledge base queries
 */

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const databaseSearchTool: FunctionDeclaration = {
  name: "databaseSearch",
  description: "Search in the local knowledge base for relevant information, to be called everytime the user asks a question related to the bank products and services",

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
    return {
      results: [],
      message: "La requête ne peut pas être vide"
    };
  }

  // TODO: Implement actual database search logic
  return {
    results: [],
    message: "Le prix de la carte visa est de 200 Dirhams par mois"
  };
} 