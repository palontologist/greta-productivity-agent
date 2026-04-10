// Type definitions for the APIs exposed to renderer processes via preload scripts.

// ----- Panel window (gretaAPI) -----------------------------------------------

interface CompanionState {
  companionState: 'idle' | 'recording' | 'processing' | 'responding';
  voiceEnabled: boolean;
  workerUrl: string;
  selectedModel: string;
  conversationTurns: number;
}

interface GretaAPI {
  // Activity data
  getRecentActivities: (limit: number) => Promise<any[]>;
  getActivitySummary: (startTime: number, endTime: number) => Promise<any[]>;
  getActivitiesByTimeRange: (startTime: number, endTime: number) => Promise<any[]>;

  // Companion state
  getState: () => Promise<CompanionState>;

  // Settings
  setWorkerUrl: (url: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setModel: (model: string) => void;
  clearHistory: () => void;

  // PTT trigger from panel UI
  triggerPTT: () => void;

  // State change listener
  onStateUpdate: (callback: (state: CompanionState) => void) => void;
}

// ----- Overlay window (overlayAPI) -------------------------------------------

interface OverlayAPI {
  onPTTStart: (callback: () => void) => void;
  onPTTStop: (callback: () => void) => void;
  onCursorPosition: (callback: (pos: { x: number; y: number }) => void) => void;
  onResponseChunk: (callback: (chunk: { text: string }) => void) => void;
  onResponseComplete: (callback: (payload: { fullText: string }) => void) => void;
  onResponseError: (callback: (payload: { message: string }) => void) => void;
  onPlayAudio: (callback: (payload: { base64: string }) => void) => void;
  onPointTo: (callback: (target: { x: number; y: number; label: string }) => void) => void;
  onShow: (callback: () => void) => void;
  onHide: (callback: () => void) => void;
  onRecordingCancelled: (callback: () => void) => void;
  sendAudioReady: (base64: string) => void;
  sendTTSFinished: () => void;
  sendRecordingCancelled: () => void;
}

declare global {
  interface Window {
    gretaAPI: GretaAPI;
    overlayAPI: OverlayAPI;
  }
}

export {};

