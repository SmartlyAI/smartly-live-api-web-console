/**
 * Database Search component to handle database search tool calls
 */
import { useEffect } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import { handleDatabaseSearch } from "../../lib/tools/database-search";

function DatabaseSearchComponent({ smartlyApiKey }: { smartlyApiKey: string }) {
  const { client } = useLiveAPIContext();

  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      const databaseSearchCall = toolCall.functionCalls.find(
        (fc) => fc.name === "databaseSearch"
      );

      if (databaseSearchCall) {
        const query = (databaseSearchCall.args as any).query;
        const response = await handleDatabaseSearch(query, smartlyApiKey);
        
        // Send the response back to the LLM
        client.sendToolResponse({
          functionResponses: [{
            response: response,
            id: databaseSearchCall.id
          }]
        });
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return null; // This component doesn't render anything
}

export default DatabaseSearchComponent; 