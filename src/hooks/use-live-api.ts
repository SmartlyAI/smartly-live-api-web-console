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
import { LiveConfig, ToolCall, ServerContent, LiveFunctionResponse, isToolResponseMessage, isModelTurn } from "../multimodal-live-types";
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
  Your goal is to provide answers based exclusively on the data available in our knowledge base.
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
  - Always consult the knowledge base search tool BEFORE answering any banking-related question.
  - Once the tool response of the tool is available, analyze search results carefully answering.
  - Base your response in the search results only, if you don't know, say you don't have the info
  - If user asked in one language, answer in the same language dont change.
  - Ask the user for more details if we dont have the info, maybe a more accurate question will lead to better results.
  
  Knowledge Limits:
  - Restrict your answers strictly to ACME Bank's products, services, and processes.
  - Politely refuse to engage in topics unrelated to the bank.
  - If the answer was not returned by the search tool response, 
  then you you are not allowed to directly answer the question..

  Managing the Conversation:
  - Ask clarifying questions when needed.
  - Handle topic changes naturally.
  - Be tolerant of potential typos in user inputs errors or typos.
  - After each answer, ask if the user has any further questions.


  `;
  
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-live-001",
    generationConfig: {
      temperature: 0,
      seed: 42,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede" // Options: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede"
          }
        },
        languageCode: "fr-FR"
      },
      /*thinkingConfig: {
        thinkingBudget: 1000 // Set a reasonable budget for thinking tokens
      }*/
    },
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
      console.log('[Tool Call] Full event:', JSON.stringify(toolCall, null, 2));
      toolCall.functionCalls.forEach(fc => {
        console.log(`[Tool Call] Function details:`, JSON.stringify(fc, null, 2));
      });
    };

    const onContent = (content: ServerContent) => {
      if (isToolResponseMessage(content)) {
        console.log('[Tool Response] Full event:', JSON.stringify(content, null, 2));
        content.toolResponse.functionResponses.forEach((fr: LiveFunctionResponse) => {
          console.log(`[Tool Response] Function response:`, JSON.stringify(fr, null, 2));
        });
      } else if (isModelTurn(content)) {
        // Check if this is a spoken message (contains audio parts)
        const hasAudioParts = content.modelTurn.parts.some(
          (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
        );
        
        if (!hasAudioParts) {
          // This is a non-spoken message (like tool responses or system messages)
          console.log('[Non-Spoken Message] Full event:', JSON.stringify(content, null, 2));
        } else {
          console.log('[Spoken Message] Full event:', JSON.stringify(content, null, 2));
        }
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
