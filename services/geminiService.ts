import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppSettings } from "../types";

// Schema for interpreting natural language commands into canvas actions
const commandSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ['ADD_ELEMENT', 'UPDATE_ELEMENT', 'DELETE_ELEMENT', 'GENERATE_IMAGE', 'UNKNOWN'],
      description: "The type of action to perform on the canvas.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Short explanation of why this action was chosen.",
    },
    parameters: {
      type: Type.OBJECT,
      description: "Parameters for the action.",
      properties: {
        elementType: { type: Type.STRING, enum: ['IMAGE', 'TEXT', 'SHAPE'], description: "For ADD_ELEMENT." },
        content: { type: Type.STRING, description: "Text content, or image description." },
        targetId: { type: Type.STRING, description: "ID of the element to update/delete. Use 'selection' if referring to currently selected item." },
        property: { type: Type.STRING, description: "Property to update (x, y, width, height, color, opacity, text)." },
        value: { type: Type.STRING, description: "New value for the property. Numbers should be cast to string." },
        imagePrompt: { type: Type.STRING, description: "For GENERATE_IMAGE: The creative prompt." },
      }
    }
  },
  required: ["action", "reasoning"],
};

// Helper to determine if a model string is a valid Gemini model we can use
const isGeminiModel = (modelId: string) => {
    return modelId.startsWith('gemini') || modelId.startsWith('imagen');
};

const callLlama = async (text: string, context: string, settings: AppSettings): Promise<any> => {
    const endpoint = settings.llmEndpoints.llama || 'https://api.groq.com/openai/v1/chat/completions';
    const apiKey = settings.apiKeys['llama-3.1-8b'];
    
    if (!apiKey) return { action: 'UNKNOWN', reasoning: 'Missing Llama API Key' };

    const prompt = `You are an AI assistant controlling a design canvas.
    Current Context: ${context}.
    User Command: "${text}"
    
    Interpret the command and output ONLY JSON matching this schema:
    { "action": "ADD_ELEMENT" | "UPDATE_ELEMENT" | "DELETE_ELEMENT" | "GENERATE_IMAGE" | "UNKNOWN", "reasoning": "string", "parameters": { ... } }
    
    ${settings.llmConfig.systemInstruction}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", // Example for Groq, adjustable
                messages: [{ role: "user", content: prompt }],
                temperature: settings.llmConfig.temperature
            })
        });
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        // Basic cleanup if model outputs markdown code blocks
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Llama API Error", e);
        return { action: 'UNKNOWN', reasoning: 'Llama API Failed' };
    }
};

const callRasa = async (text: string, context: string, settings: AppSettings): Promise<any> => {
    const endpoint = settings.llmEndpoints.rasa;
    if (!endpoint) return { action: 'UNKNOWN', reasoning: 'Missing Rasa Endpoint' };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: "user",
                message: text,
                metadata: { context } // Pass context if Rasa is configured to use it
            })
        });
        
        const data = await response.json();
        // Assuming Rasa bot is trained to return the JSON command in the text field of the first message
        // Or specific custom payload. For this demo, we assume text.
        if (data && data.length > 0 && data[0].text) {
             const jsonStr = data[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
             return JSON.parse(jsonStr);
        }
        return { action: 'UNKNOWN', reasoning: 'Rasa returned no valid command' };
    } catch (e) {
        console.error("Rasa API Error", e);
        return { action: 'UNKNOWN', reasoning: 'Rasa API Failed' };
    }
};

const callPipecat = async (text: string, context: string, settings: AppSettings): Promise<any> => {
    const endpoint = settings.llmEndpoints.pipecat;
    if (!endpoint) return { action: 'UNKNOWN', reasoning: 'Missing Pipecat Endpoint' };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: text,
                context: context
            })
        });
        const data = await response.json();
        return data; // Assuming Pipecat agent returns the exact JSON structure
    } catch (e) {
        console.error("Pipecat API Error", e);
        return { action: 'UNKNOWN', reasoning: 'Pipecat API Failed' };
    }
};


export const interpretVoiceCommand = async (
  audioBase64: string, 
  currentContext: string,
  settings: AppSettings
): Promise<any> => {
  const modelId = settings.llmModel;

  // 1. Multimodal Path (Gemini) - Sends Audio Directly
  if (isGeminiModel(modelId)) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm', // Corrected from audio/wav to match browser MediaRecorder default
                  data: audioBase64
                }
              },
              {
                text: `You are an AI assistant controlling a design canvas. 
                Current Context (Selected items, etc): ${currentContext}.
                
                Interpret the user's voice command and output a JSON action.
                If they ask to "Generate" or "Create" an image of something specific, use GENERATE_IMAGE.
                If they want to add text, use ADD_ELEMENT with type TEXT.
                If they want to move, resize, or change color of the selected item, use UPDATE_ELEMENT.
                
                Return JSON matching the schema.`
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: commandSchema,
            systemInstruction: settings.llmConfig.systemInstruction || "You are a precise design assistant. Output only valid JSON.",
            temperature: settings.llmConfig.temperature,
            topP: settings.llmConfig.topP,
          }
        });

        const text = response.text;
        if (!text) return { action: 'UNKNOWN' };
        return JSON.parse(text);

      } catch (error) {
        console.error("Error interpreting command (Gemini):", error);
        return { action: 'UNKNOWN', error: String(error) };
      }
  } 
  
  // 2. Text-Based Path (Llama, Rasa, Pipecat) - Needs Transcribe First
  else {
      try {
          // Step A: Transcribe using Gemini Flash (Fast/Cheap)
          const textCommand = await transcribeAudio(audioBase64, settings);
          if (!textCommand) return { action: 'UNKNOWN', reasoning: 'Transcription failed' };

          // Step B: Route to specific provider
          return await interpretTextCommand(textCommand, currentContext, settings);

      } catch (error) {
          console.error("Error in Voice->Text->Command pipeline:", error);
          return { action: 'UNKNOWN', error: String(error) };
      }
  }
};

export const interpretTextCommand = async (
  textCommand: string,
  currentContext: string,
  settings: AppSettings
): Promise<any> => {
   const modelId = settings.llmModel;

   if (modelId === 'llama-3.1-8b') {
       return await callLlama(textCommand, currentContext, settings);
   } else if (modelId === 'rasa') {
       return await callRasa(textCommand, currentContext, settings);
   } else if (modelId === 'pipecat') {
       return await callPipecat(textCommand, currentContext, settings);
   }

   // Fallback to Gemini for text commands if selected or if model unknown
   try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Default to Flash if configured model is generic Gemini
    let geminiModel = modelId;
    if (!isGeminiModel(geminiModel)) geminiModel = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          {
            text: `You are an AI assistant controlling a design canvas. 
            Current Context: ${currentContext}.
            
            User Command: "${textCommand}"
            
            Interpret the command and output a JSON action.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: commandSchema,
        systemInstruction: settings.llmConfig.systemInstruction,
        temperature: settings.llmConfig.temperature,
        topP: settings.llmConfig.topP,
      }
    });

    const text = response.text;
    if (!text) return { action: 'UNKNOWN' };
    return JSON.parse(text);

  } catch (error) {
    console.error("Error interpreting text command (Gemini):", error);
    return { action: 'UNKNOWN' };
  }
}

export const enhancePrompt = async (originalPrompt: string, settings: AppSettings): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let model = settings.llmModel;
    if (!isGeminiModel(model)) {
        model = 'gemini-2.5-flash';
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: `Act as a professional prompt engineer for AI art generation. 
        Enhance the following prompt to be more descriptive, artistic, and detailed, suitable for high-quality image generation.
        Keep it concise (under 50 words).
        
        Original Prompt: "${originalPrompt}"` }]
      },
      config: {
          temperature: 0.8
      }
    });
    return response.text?.trim() || originalPrompt;
  } catch (e) {
    console.error("Error enhancing prompt:", e);
    return originalPrompt;
  }
};

export const generateImageAsset = async (prompt: string, settings: AppSettings): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = settings.imageModel;
    
    // Handle Imagen Models
    if (model.includes('imagen')) {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001', // Ensure correct mapping
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        });
        const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64EncodeString) {
             return `data:image/jpeg;base64,${base64EncodeString}`;
        }
        return null;
    }

    // Handle Gemini Image Models (Nano Banana, Nano Banana Pro)
    // Fallback for external models (DALL-E etc) to Gemini Pro Image for demo purposes
    let geminiModel = 'gemini-2.5-flash-image'; // Default Nano Banana
    if (model === 'gemini-3-pro-image-preview' || !isGeminiModel(model)) {
        geminiModel = 'gemini-3-pro-image-preview'; // Default Nano Banana Pro
    }

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [{ text: prompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, settings: AppSettings): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Fast and cheap for transcription
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: audioBase64 } }, // Assuming webm from browser recorder
            { text: "Transcribe the audio exactly. Output only the transcription text, no preamble." }
          ]
        }
      });
      return response.text || '';
    } catch (error) {
      console.error("Transcription failed", error);
      return '';
    }
};
