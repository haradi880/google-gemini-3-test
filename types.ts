export enum AppMode {
  CHAT = 'CHAT',
  VISION = 'VISION',
  LIVE = 'LIVE',
  BUILDER = 'BUILDER'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isLoading?: boolean;
  image?: string; // base64 string for vision mode
}

export interface AudioFrequencyData {
  values: Float32Array;
}

export interface ProjectFile {
  name: string;
  content: string;
}