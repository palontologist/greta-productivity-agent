import { contextBridge, ipcRenderer } from 'electron';

// Expose a secure, narrow API to the panel renderer.
// Nothing from Node.js or Electron internals is exposed directly.
contextBridge.exposeInMainWorld('gretaAPI', {
  // ------- Activity data (read-only) ----------------------------------------
  getRecentActivities: (limit: number) =>
    ipcRenderer.invoke('get-recent-activities', limit),
  getActivitySummary: (startTime: number, endTime: number) =>
    ipcRenderer.invoke('get-activity-summary', startTime, endTime),
  getActivitiesByTimeRange: (startTime: number, endTime: number) =>
    ipcRenderer.invoke('get-activities-by-time-range', startTime, endTime),

  // ------- Companion state --------------------------------------------------
  getState: () => ipcRenderer.invoke('get-state'),

  // ------- Settings (one-way from renderer to main) -------------------------
  setWorkerUrl: (url: string) => ipcRenderer.send('set-worker-url', { url }),
  setVoiceEnabled: (enabled: boolean) =>
    ipcRenderer.send('set-voice-enabled', { enabled }),
  setModel: (model: string) => ipcRenderer.send('set-model', { model }),
  clearHistory: () => ipcRenderer.send('clear-history'),

  // ------- PTT trigger from the panel UI ------------------------------------
  triggerPTT: () => ipcRenderer.send('trigger-ptt'),

  // ------- State change listener --------------------------------------------
  onStateUpdate: (
    callback: (state: {
      companionState: string;
      voiceEnabled: boolean;
      workerUrl: string;
      selectedModel: string;
      conversationTurns: number;
    }) => void
  ) => {
    ipcRenderer.on('state-update', (_event, state) => callback(state));
  },
});
