import { GoogleGenAI, Chat, GenerateContentResponse, Type, Schema } from "@google/genai";
import { ProjectFile } from "../types";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createChatSession = (systemInstruction?: string): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
};

export const generateVisionContent = async (
  prompt: string, 
  base64Image: string, 
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash for general multimodal tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt || "Analyze this image.",
          },
        ],
      },
    });
    return response.text || "No response text generated.";
  } catch (error) {
    console.error("Vision API Error:", error);
    throw error;
  }
};

const projectSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "File name with extension (e.g., index.html)" },
      content: { type: Type.STRING, description: "Full content of the file" },
    },
    required: ["name", "content"],
  },
};

export const generateProject = async (
  prompt: string, 
  media?: { data: string; mimeType: string }
): Promise<ProjectFile[]> => {
  
  const parts: any[] = [];
  
  if (media) {
    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.data
      }
    });
    parts.push({ text: "Use this image or video as a strict visual reference for the UI design, layout, and styling." });
  }

  parts.push({ 
    text: `Create a web application based on this request: "${prompt}". 
    Return a list of files (index.html, style.css, script.js, etc.) required to run the application. 
    
    Requirements:
    1. The code must be complete, production-ready, and self-contained.
    2. The index.html must include proper meta tags (viewport, charset, description) and a descriptive <title>.
    3. Include a functional loading spinner component or visual loading state (e.g., a CSS loader) that is displayed during initialization or async operations to enhance user experience.
    4. Use CDN links for external libraries (like Three.js, React, Tailwind) if needed.` 
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Gemini 3 for complex coding tasks
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: projectSchema,
      systemInstruction: "You are an expert full-stack web developer. Generate clean, modern, and working code. If an image is provided, replicate its visual style, color palette, and layout as closely as possible.",
    },
  });

  return parseJSONResponse(response.text);
};

export const editProject = async (currentFiles: ProjectFile[], instruction: string): Promise<ProjectFile[]> => {
  const fileContext = currentFiles.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Gemini 3 for complex coding tasks
    contents: `Here are the current files of a web application:
    
    ${fileContext}
    
    User Instruction: "${instruction}"
    
    Return the updated list of files. You must return ALL files, even if some haven't changed, to ensure consistency.
    Ensure index.html retains proper meta tags and title.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: projectSchema,
      systemInstruction: "You are an expert web developer. Modify the code to satisfy the user request. Ensure the code remains functional.",
    },
  });

  return parseJSONResponse(response.text);
};

const parseJSONResponse = (text: string | undefined): ProjectFile[] => {
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("Failed to parse JSON directly, trying to strip markdown", e);
    const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e2) {
            console.error("Failed to parse JSON from markdown", e2);
            return [];
        }
    }
    return [];
  }
};