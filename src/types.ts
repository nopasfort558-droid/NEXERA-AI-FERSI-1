export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  bio: string;
  membershipTier: 'Free' | 'VIP Pro' | 'Limitless Elite';
  joinDate: string;
  stats: {
    chatsCount: number;
    imagesCount: number;
    visionCount: number;
    tokensUsed: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  persona?: 'nexera' | 'gojo' | 'sasuke' | string;
  modelUsed?: string;
  agentName?: string;
  agentAvatar?: string;
}

export interface GeneratedImageItem {
  id: string;
  url: string;
  originalPrompt: string;
  enhancedPrompt: string;
  style: string;
  aspectRatio: string;
  timestamp: string;
}

export interface VisionAnalysis {
  id: string;
  imageUrl: string;
  prompt: string;
  result: string;
  timestamp: string;
  modelUsed?: string;
}

export type TabType = 
  | 'dashboard' 
  | 'chat' 
  | 'image' 
  | 'vision' 
  | 'profil' 
  | 'wabot' 
  | 'appbuilder'
  | 'agents'
  | 'memory'
  | 'voice'
  | 'knowledge'
  | 'writing';

export type WritingCategory = 
  | 'puisi' 
  | 'pantun' 
  | 'cerpen' 
  | 'novel' 
  | 'quotes' 
  | 'caption' 
  | 'surat' 
  | 'artikel' 
  | 'rangkuman' 
  | 'terjemahan' 
  | 'perbaiki' 
  | 'lanjutkan' 
  | 'custom';

export interface AIWritingItem {
  id: string;
  title: string;
  type: WritingCategory;
  content: string;
  tone: string;
  wordCount: number;
  theme?: string;
  createdAt: string;
}

export type WABotType = 'ai-reply' | 'customer-service' | 'information' | 'menu' | 'group';

export type WAAiProvider = 'chatgpt' | 'grok';
export type ChatGPTModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
export type GrokModel = 'grok-beta' | 'grok-2-latest' | 'grok-2';
export type WAAiModel = ChatGPTModel | GrokModel | string;

export type WASpeechStyle = 'santai' | 'formal' | 'lucu' | 'islami' | 'cs' | 'gojo' | 'sasuke' | 'custom';
export type WAGroupMode = 'mention_only' | 'active' | 'silent';
export type WAConnectionStatus = 'disconnected' | 'connecting' | 'waiting_qr' | 'waiting_code' | 'connected' | 'error';

export interface WABotFeatures {
  aiAutoReply: boolean;
  customCommands: boolean;
  miniGames: boolean;
  stickerMaker: boolean;
  welcomeMessage: boolean;
  antiSpam: boolean;
  ownerAdmin: boolean;
}

export interface WABotConfig {
  id: string;
  name: string;
  ownerPhone: string;
  aiProvider: WAAiProvider;
  aiModel: string;
  speechStyle: WASpeechStyle;
  customPrompt: string;
  features: WABotFeatures;
  groupMode: WAGroupMode;
  allowPrivate: boolean;
  allowGroup: boolean;
  connectionMethod: 'pairing' | 'qr';
  phoneNumber: string;
  welcomeText: string;
  prefix: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WABotProject {
  id: string;
  name: string;
  type: WABotType;
  description: string;
  files: {
    'index.js': string;
    'package.json': string;
    '.env.example': string;
    'README.md': string;
  };
  setupGuide: string;
  connectionMethod: 'pairing' | 'qr';
  testRules?: Array<{ trigger: string; response: string }>;
  timestamp: string;
}

export interface AppProject {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
  activeFile: string;
  previewHtml: string;
  androidConfig: {
    appId: string;
    appName: string;
    capacitorConfig: string;
    buildGuide: string;
  };
  timestamp: string;
}

export interface AIAgent {
  id: string;
  userId: string;
  name: string;
  role: string;
  personality: string;
  speakingStyle: string;
  instructions: string;
  avatar: string;
  category: 'coding' | 'anime' | 'business' | 'creative' | 'tutor';
  createdAt: string;
}

export interface AIMemoryItem {
  id: string;
  userId: string;
  category: 'profile' | 'preference' | 'project' | 'fact';
  fact: string;
  enabled: boolean;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  userId: string;
  name: string;
  size: string;
  type: string;
  text: string;
  summary: string;
  charCount: number;
  uploadedAt: string;
}
