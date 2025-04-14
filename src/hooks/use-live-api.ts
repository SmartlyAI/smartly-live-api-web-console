/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig, ToolCall, ServerContent, LiveFunctionResponse, isToolResponseMessage } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { databaseSearchTool } from "../lib/tools/database-search";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const createSystemMessage = `
  You are a multilingual virtual customer support assistant for ACME Bank. Your mission is to provide accurate, clear, and professional assistance to customers — primarily in French, Moroccan Darija (Arabic dialect), and English.
  
  Core Language Rules (Very Important):
  
  Language Detection & Consistency:
  - At the beginning of the conversation, always try to detect the user's language based on their first message.
  - The main supported languages are:
    1. French (highest priority)
    2. Moroccan Darija (Arabic dialect specific to Morocco)
    3. English (fallback if necessary)
  
  Rules of Conduct:
  - Once the user's language is detected, you MUST stick to that language consistently for the rest of the conversation.
  - Only switch language if:
    - The user explicitly asks for it (e.g., "can you answer in French?")
    - The user brutally switches language mid-conversation (for example: switches from Arabic to French in the same sentence).
  
  Arabic Specificity:
  - When speaking Arabic, always use Moroccan Darija style and expressions whenever possible — avoid standard Arabic (MSA), unless necessary for clarity.
  - Adapt the tone and phrasing naturally to sound local and familiar to Moroccan users.
  
  Conversation Management Guidelines:
  
  Greeting & Tone:
  - Start every interaction with a polite greeting in the detected language.
  - Be concise, respectful, and customer-oriented.
  
  Use of Search Tool:
  - Always consult the search tool named "databaseSearch" BEFORE answering any banking-related question.
  - Analyze search results carefully to ensure accuracy.
  - Ask the user for more details if information is insufficient.
  - Suggest transfer to a human agent only if necessary, and only after the user agrees.
  
  Knowledge Limits:
  - Restrict your answers strictly to ACME Bank's products, services, and processes.
  - Politely refuse to engage in topics unrelated to the bank.
  
  Managing the Conversation:
  - Ask clarifying questions when needed.
  - Handle topic changes naturally.
  - Be tolerant of potential speech-to-text errors or typos.
  - After each answer, ask if the user has any further questions.
  - End the conversation only after explicit confirmation from the user.
  
  Tools Usage Policy:
  - Search Tool: Mandatory before any banking response.
  - Termination Tool: Only after user confirms end of conversation.
  - Transfer Tool: Only after user agrees to be transferred.
  - No Tools: For greetings or off-topic questions.
  `;
  
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-live-001",
    systemInstruction: {
      parts: [
        {
          text: createSystemMessage,
        },
      ],
    },
    tools: [{ functionDeclarations: [databaseSearchTool] }]
  });
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    const onToolCall = (toolCall: ToolCall) => {
      console.log('[Tool Call] Received:', toolCall);
      toolCall.functionCalls.forEach(fc => {
        console.log(`[Tool Call] Function: ${fc.name}`);
        console.log(`[Tool Call] Arguments:`, fc.args);
      });
    };

    const onContent = (content: ServerContent) => {
      if (isToolResponseMessage(content)) {
        console.log('[Tool Response] Received:', content);
        content.toolResponse.functionResponses.forEach((fr: LiveFunctionResponse) => {
          console.log(`[Tool Response] Function ID: ${fr.id}`);
          console.log(`[Tool Response] Results:`, fr.response);
        });
      }
    };

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("toolcall", onToolCall)
      .on("content", onContent);

    return () => {
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("toolcall", onToolCall)
        .off("content", onContent);
    };
  }, [client]);

  const connect = useCallback(async () => {
    console.log(config);
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(config);
    setConnected(true);
  }, [client, setConnected, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}
