import { contextBridge, ipcRenderer } from 'electron';

// Exposes a narrow API to the overlay renderer process.
// The overlay handles microphone recording, TTS playback, and visual animations.
contextBridge.exposeInMainWorld('overlayAPI', {
  // ------- Listeners (main → overlay) --------------------------------------

  /** Main process signals that push-to-talk recording should begin. */
  onPTTStart: (callback: () => void) => {
    ipcRenderer.on('ptt-start', () => callback());
  },

  /** Main process signals that recording should stop and audio should be sent. */
  onPTTStop: (callback: () => void) => {
    ipcRenderer.on('ptt-stop', () => callback());
  },

  /** Cursor position updates for the companion dot (sent ~20 fps while active). */
  onCursorPosition: (callback: (pos: { x: number; y: number }) => void) => {
    ipcRenderer.on('cursor-position', (_event, pos) => callback(pos));
  },

  /** Streaming text chunk from Claude. */
  onResponseChunk: (callback: (chunk: { text: string }) => void) => {
    ipcRenderer.on('response-chunk', (_event, chunk) => callback(chunk));
  },

  /** Complete response text (all chunks assembled). */
  onResponseComplete: (callback: (payload: { fullText: string }) => void) => {
    ipcRenderer.on('response-complete', (_event, payload) => callback(payload));
  },

  /** Claude returned an error. */
  onResponseError: (callback: (payload: { message: string }) => void) => {
    ipcRenderer.on('response-error', (_event, payload) => callback(payload));
  },

  /** Main process sends base64-encoded MP3 audio for TTS playback. */
  onPlayAudio: (callback: (payload: { base64: string }) => void) => {
    ipcRenderer.on('play-audio', (_event, payload) => callback(payload));
  },

  /** Companion should animate/fly to the specified screen coordinates. */
  onPointTo: (callback: (target: { x: number; y: number; label: string }) => void) => {
    ipcRenderer.on('point-to', (_event, target) => callback(target));
  },

  /** Show the overlay (fade in). */
  onShow: (callback: () => void) => {
    ipcRenderer.on('show', () => callback());
  },

  /** Hide the overlay (fade out). */
  onHide: (callback: () => void) => {
    ipcRenderer.on('hide', () => callback());
  },

  /** The recording was cancelled before audio was sent. */
  onRecordingCancelled: (callback: () => void) => {
    ipcRenderer.on('recording-cancelled', () => callback());
  },

  // ------- Senders (overlay → main) ----------------------------------------

  /** Send the recorded audio (base64-encoded WebM/Opus) to the main process. */
  sendAudioReady: (base64: string) => {
    ipcRenderer.send('audio-ready', { base64 });
  },

  /** Notify the main process that TTS playback has finished. */
  sendTTSFinished: () => {
    ipcRenderer.send('tts-finished');
  },

  /** Notify main that the user cancelled (e.g. no audio captured). */
  sendRecordingCancelled: () => {
    ipcRenderer.send('recording-cancelled');
  },
});
