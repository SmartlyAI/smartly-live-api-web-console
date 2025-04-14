/**
 * Database search tool for local knowledge base queries
 */

import axios from 'axios';

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
export async function handleDatabaseSearch(query: string, smartlyApiKey: string): Promise<DatabaseSearchResponse> {
  console.log('HERE');
  try {
      console.log(`[Database Search] Received query: "${query}"`);
      
      if (!query || query.trim() === '') {
        return {
          results: [],
          message: "La requête ne peut pas être vide"
        };
      }
    
      let searchResults: { pageContent: string; score: number; metadata?: any }[] = [];
      let toolResponse = '';
      let functionCallMessage = null;
    
      let url = 'https://bots.smartly.ai/apis/builder/api/assistantKnowledges/chunk/assistant/67f8f71cefc26dd42d25fe74?search=' + encodeURIComponent(query) + '&page=1&';
                console.log('url: ', url);
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': 'Bearer ' + smartlyApiKey
                    }
                });
                console.log('response: ', response.data.chunks.chunks);
                // Process the response data
                if (response.data && response.data.chunks && response.data.chunks.chunks) {
                    const chunks = response.data.chunks.chunks;
                  console.log('chunks',chunks);
                    chunks.forEach((chunk: [ { pageContent: string; metadata?: any }, number ]) => {
                    if (chunk && chunk.length >= 2) {
                        const content = chunk[0].pageContent;
                        const score = chunk[1];
                      console.log({
                          pageContent: content,
                          score: score,
                        });
                        searchResults.push({
                          pageContent: content,
                          score: score,
                        });
                      }
                    });
                }
        
        // Remove duplicates and keep the one with the best score
        searchResults = searchResults.filter((item, index, self) => 
            index === self.findIndex((t) => t.pageContent === item.pageContent)
        );
        // Sort the results by score
        searchResults = searchResults.sort((a, b) => b.score - a.score);
        // Keep the top 10 results
        searchResults = searchResults.slice(0, 10);

        // Create the tool response
        if (searchResults.length > 0) {
            toolResponse = 'Voici les résultats de votre recherche:';
            toolResponse += JSON.stringify(searchResults);
        } else {
            toolResponse = 'Aucun résultat trouvé pour votre recherche.';
        }

    return {
      results: [],
      message: toolResponse
    };
  } catch (error) {
        console.log('Error performing search:', error);
      // TODO: Implement actual database search logic
    let message = 'unknown error';
      if (error instanceof Error) {
        message = error.message;
      }
    return {
      results: [],
      message: message
    };
  }  
  
} 