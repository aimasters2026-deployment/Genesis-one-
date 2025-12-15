
export enum ElementType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  SHAPE = 'SHAPE',
  ART_GEN = 'ART_GEN',
  GROUP = 'GROUP',
  EMPTY = 'EMPTY'
}

export type Theme = 'dark' | 'light';

export const CANVAS_SIZE = { width: 800, height: 800 };

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  content: string; // URL for image, text content for text, color/shape type for shape
  
  // New Properties
  visible: boolean;
  locked: boolean;
  parentId: string | null; // For grouping
  expanded?: boolean; // For group UI state

  modelId?: string; // Specific AI model assigned to this layer
  shapeType?: 'rectangle' | 'circle'; // Specific for SHAPE layers
  genConfig?: { // Specific for ART_GEN layers
    prompt?: string;
    negativePrompt?: string;
    guidanceScale?: number;
    seed?: number;
  };
  style?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string; // 'normal' | 'bold'
    fontStyle?: string; // 'normal' | 'italic'
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: string;
    mixBlendMode?: string; // Blend mode
  };
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[]; // Changed from single ID to array for multi-select
  zoom: number;
  pan: { x: number; y: number };
  history: CanvasElement[][]; 
  historyIndex: number;
}

export enum ToolType {
  SELECT = 'SELECT',
  HAND = 'HAND',
  TEXT = 'TEXT',
  RECTANGLE = 'RECTANGLE',
  IMAGE = 'IMAGE',
  ART_GEN = 'ART_GEN'
}

// AI Action Types returned by Gemini
export interface AIAction {
  action: 'ADD_ELEMENT' | 'UPDATE_ELEMENT' | 'DELETE_ELEMENT' | 'GENERATE_IMAGE' | 'UNKNOWN';
  reasoning: string;
  parameters: any;
}

export interface GenerateImageParams {
  prompt: string;
  style?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface AppSettings {
  imageModel: string;
  llmModel: string;
  llmConfig: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
    systemInstruction: string;
  };
  llmEndpoints: {
    llama: string;
    rasa: string;
    pipecat: string;
  };
  imageConfig: {
    aspectRatio: string;
    numberOfImages: number;
    outputMimeType: string;
  };
  promptTemplates: PromptTemplate[];
  apiKeys: Record<string, string>;
}

export const AVAILABLE_IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro (Default)' }, 
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana' }, 
  { id: 'imagen-4.0-generate-001', name: 'Imagen 4' },
  { id: 'deepart', name: 'DeepArt' },
  { id: 'artbreeder', name: 'ArtBreeder' },
  { id: 'runwayml', name: 'RunwayML' },
  { id: 'dalle', name: 'DALL-E' },
];

export const AVAILABLE_LLM_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B (via API)' },
  { id: 'pipecat', name: 'Pipecat Agent' },
  { id: 'rasa', name: 'Rasa NLP' },
];

export const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
];
