/**
 * Google Search tool for web search queries
 */

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const googleSearchTool: FunctionDeclaration = {
  name: "googleSearch",
  description: "Search the web using Google Search",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query to look up on the web"
      }
    },
    required: ["query"]
  }
}; 