import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  nativeImage,
  globalShortcut,
  desktopCapturer,
  screen,
  session,
  Menu,
} from 'electron';
import * as path from 'path';
import * as zlib from 'zlib';
import { ActivityDatabase } from './database';
import { ActivityTracker } from './tracker';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type CompanionState = 'idle' | 'recording' | 'processing' | 'responding';

let panelWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: ActivityDatabase;
let tracker: ActivityTracker;

let companionState: CompanionState = 'idle';
// Conversation history stored in Claude's messages format
let conversationHistory: { role: string; content: { type: string; text?: string; source?: { type: string; media_type: string; data: string } }[] }[] = [];
let cursorTrackerInterval: NodeJS.Timeout | null = null;
let responseHideTimeout: NodeJS.Timeout | null = null;
let workerUrl = 'http://localhost:8787'; // overridden by the panel's settings
let voiceEnabled = true;
let selectedModel = 'claude-sonnet-4-5';

// ---------------------------------------------------------------------------
// Tray icon — generated as a valid PNG at runtime (no asset files required)
// ---------------------------------------------------------------------------

function buildTrayIconPng(): Buffer {
  const size = 22;
  // Build uncompressed PNG scanlines: each row is [filterByte, R,G,B,A, R,G,B,A, ...]
  const rows: number[] = [];
  const centerX = (size - 1) / 2;
  const centerY = (size - 1) / 2;
  const radius = size * 0.4;

  for (let y = 0; y < size; y++) {
    rows.push(0); // PNG filter type: None
    for (let x = 0; x < size; x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance <= radius) {
        rows.push(102, 126, 234, 255); // #667eea — Greta blue, fully opaque
      } else {
        rows.push(0, 0, 0, 0); // fully transparent
      }
    }
  }

  const rawPixels = Buffer.from(rows);
  const compressedPixels = zlib.deflateSync(rawPixels, { level: 6 });

  // CRC-32 implementation (required by PNG spec)
  function crc32(buffer: Buffer): number {
    const table: number[] = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      return c;
    });
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function pngChunk(type: string, data: Buffer): Buffer {
    const typeBytes = Buffer.from(type, 'ascii');
    const lengthBuf = Buffer.alloc(4);
    lengthBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
    return Buffer.concat([lengthBuf, typeBytes, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressedPixels),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createTray(): void {
  const iconPng = buildTrayIconPng();
  const icon = nativeImage.createFromBuffer(iconPng);
  icon.setTemplateImage(true); // macOS: adapts to light/dark menu bar

  tray = new Tray(icon);
  tray.setToolTip('Greta — AI Productivity Companion');

  tray.on('click', () => {
    if (panelWindow) {
      if (panelWindow.isVisible()) {
        panelWindow.hide();
      } else {
        positionAndShowPanel();
      }
    }
  });

  // Right-click context menu with a quit option
  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Panel', click: () => positionAndShowPanel() },
      { type: 'separator' },
      { label: 'Quit Greta', click: () => app.quit() },
    ]);
    tray!.popUpContextMenu(contextMenu);
  });
}

function positionAndShowPanel(): void {
  if (!panelWindow || !tray) return;
  const trayBounds = tray.getBounds();
  const windowBounds = panelWindow.getBounds();
  const displayBounds = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y }).workArea;

  // Position the panel just below (or above on Windows) the tray icon
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  let y = Math.round(trayBounds.y + trayBounds.height + 4);

  // Keep the panel within the display bounds
  x = Math.max(displayBounds.x, Math.min(x, displayBounds.x + displayBounds.width - windowBounds.width));
  y = Math.max(displayBounds.y, Math.min(y, displayBounds.y + displayBounds.height - windowBounds.height));

  panelWindow.setPosition(x, y);
  panelWindow.show();
  panelWindow.focus();
}

function createPanelWindow(): void {
  panelWindow = new BrowserWindow({
    width: 360,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  panelWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Hide instead of close so the tray remains functional
  panelWindow.on('close', (event) => {
    event.preventDefault();
    panelWindow!.hide();
  });

  // Auto-hide when the panel loses focus
  panelWindow.on('blur', () => {
    // Don't hide when the overlay is interacting (it would steal focus otherwise)
    if (companionState === 'idle') {
      panelWindow?.hide();
    }
  });
}

function createOverlayWindow(): void {
  // Cover all displays by using the combined bounds of all screens
  const allDisplays = screen.getAllDisplays();
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const display of allDisplays) {
    const { x, y, width, height } = display.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  overlayWindow = new BrowserWindow({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
}

// ---------------------------------------------------------------------------
// Cursor tracking — polls screen position and forwards to the overlay
// ---------------------------------------------------------------------------

function startCursorTracking(): void {
  if (cursorTrackerInterval) return;
  cursorTrackerInterval = setInterval(() => {
    const point = screen.getCursorScreenPoint();
    overlayWindow?.webContents.send('cursor-position', { x: point.x, y: point.y });
  }, 50); // ~20 fps — smooth enough without excessive IPC traffic
}

function stopCursorTracking(): void {
  if (cursorTrackerInterval) {
    clearInterval(cursorTrackerInterval);
    cursorTrackerInterval = null;
  }
}

// ---------------------------------------------------------------------------
// Overlay visibility helpers
// ---------------------------------------------------------------------------

function showOverlay(): void {
  if (responseHideTimeout) {
    clearTimeout(responseHideTimeout);
    responseHideTimeout = null;
  }
  overlayWindow?.show();
  overlayWindow?.webContents.send('show');
}

function scheduleHideOverlay(): void {
  responseHideTimeout = setTimeout(() => {
    overlayWindow?.webContents.send('hide');
    // Give the fade-out animation time to finish before hiding the window
    setTimeout(() => {
      if (companionState === 'idle') {
        overlayWindow?.hide();
      }
    }, 600);
  }, 2000);
}

// ---------------------------------------------------------------------------
// Notification helper — broadcasts current state to the panel
// ---------------------------------------------------------------------------

function broadcastStateToPanel(): void {
  if (!panelWindow) return;
  panelWindow.webContents.send('state-update', {
    companionState,
    voiceEnabled,
    workerUrl,
    selectedModel,
    conversationTurns: conversationHistory.length / 2,
  });
}

// ---------------------------------------------------------------------------
// Screenshot capture using desktopCapturer
// ---------------------------------------------------------------------------

interface Screenshot {
  base64: string;
  display: string;
}

async function captureScreenshots(): Promise<Screenshot[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    return sources.map((source, index) => ({
      base64: source.thumbnail.toPNG().toString('base64'),
      display: `screen${index + 1}`,
    }));
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Activity context — summarise recent DB records for Claude's system prompt
// ---------------------------------------------------------------------------

function buildActivityContext(): string {
  try {
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    const recentActivities = db.getActivitiesByTimeRange(thirtyMinutesAgo, now);

    if (recentActivities.length === 0) {
      return 'No recent activity recorded.';
    }

    // Aggregate time per app over the last 30 minutes
    const appTotals = new Map<string, { totalMs: number; category: string }>();
    for (const activity of recentActivities) {
      const existing = appTotals.get(activity.appName);
      if (existing) {
        existing.totalMs += activity.duration || 0;
      } else {
        appTotals.set(activity.appName, {
          totalMs: activity.duration || 0,
          category: activity.category || 'Uncategorized',
        });
      }
    }

    const lines: string[] = ['Recent activity (last 30 minutes):'];
    const sortedApps = [...appTotals.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs);
    for (const [appName, { totalMs, category }] of sortedApps.slice(0, 8)) {
      const minutes = Math.round(totalMs / 60000);
      lines.push(`  • ${appName} — ${minutes}m (${category})`);
    }

    // Most recent window title for immediate context
    const latestActivity = recentActivities[0];
    if (latestActivity) {
      lines.push(`\nCurrently in: ${latestActivity.appName} — "${latestActivity.windowTitle}"`);
    }

    return lines.join('\n');
  } catch (error) {
    console.error('Failed to build activity context:', error);
    return 'Activity context unavailable.';
  }
}

// ---------------------------------------------------------------------------
// Claude streaming call
// ---------------------------------------------------------------------------

async function callClaude(
  transcript: string,
  screenshots: Screenshot[]
): Promise<void> {
  companionState = 'responding';
  broadcastStateToPanel();

  const activityContext = buildActivityContext();

  const systemPrompt =
    `You are Greta, a helpful AI productivity companion embedded in a macOS/Windows/Linux desktop app. ` +
    `You can see the user's screen and know what they have been working on. ` +
    `Be concise, warm, and actionable. If you want to point at something on screen use the syntax ` +
    `[POINT:x,y:label] where x,y are pixel coordinates (the companion cursor will fly there). ` +
    `Do not make up coordinates — only use them when referencing something clearly visible in the screenshot.\n\n` +
    activityContext;

  // Build the user message with text + screenshot images
  const userContent: { type: string; text?: string; source?: { type: string; media_type: string; data: string } }[] = [
    { type: 'text', text: transcript },
  ];

  for (const screenshot of screenshots) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: screenshot.base64,
      },
    });
  }

  conversationHistory.push({ role: 'user', content: userContent });

  const requestBody = JSON.stringify({
    model: selectedModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
    stream: true,
  });

  let fullResponseText = '';

  try {
    const response = await fetch(`${workerUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    // Parse the SSE stream coming from Claude through the Worker
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let currentEventType = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const rawData = line.slice(6).trim();
          if (rawData === '[DONE]') continue;
          try {
            const parsed = JSON.parse(rawData) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (
              currentEventType === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta.text
            ) {
              const textChunk = parsed.delta.text;
              fullResponseText += textChunk;
              overlayWindow?.webContents.send('response-chunk', { text: textChunk });
            }
          } catch {
            // Ignore malformed SSE lines
          }
          currentEventType = '';
        }
      }
    }
  } catch (error) {
    console.error('Claude call failed:', error);
    overlayWindow?.webContents.send('response-error', {
      message: String(error),
    });
    companionState = 'idle';
    broadcastStateToPanel();
    scheduleHideOverlay();
    stopCursorTracking();
    return;
  }

  // Store the assistant reply in conversation history
  conversationHistory.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponseText }],
  });

  // Notify the overlay that the full response has arrived
  overlayWindow?.webContents.send('response-complete', { fullText: fullResponseText });

  // Animate the companion to any [POINT:x,y:label] targets embedded in the response
  schedulePointAnimations(fullResponseText);

  // Play TTS or go straight to idle
  if (voiceEnabled) {
    await callTTS(fullResponseText);
  } else {
    finalizeInteraction();
  }
}

// ---------------------------------------------------------------------------
// Parse and schedule [POINT:x,y:label] animations
// ---------------------------------------------------------------------------

function schedulePointAnimations(text: string): void {
  const pointTagPattern = /\[POINT:(\d+),(\d+)(?::([^\]:]*))?\]/g;
  let match: RegExpExecArray | null;
  let delayMs = 500; // small initial delay so the response text appears first

  while ((match = pointTagPattern.exec(text)) !== null) {
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    const label = match[3] || '';
    setTimeout(() => {
      overlayWindow?.webContents.send('point-to', { x, y, label });
    }, delayMs);
    delayMs += 2500; // stagger multiple points
  }
}

// ---------------------------------------------------------------------------
// ElevenLabs TTS
// ---------------------------------------------------------------------------

async function callTTS(fullText: string): Promise<void> {
  // Strip [POINT:...] tags from the spoken text
  const spokenText = fullText.replace(/\[POINT:[^\]]+\]/g, '').trim();

  if (!spokenText) {
    finalizeInteraction();
    return;
  }

  try {
    const response = await fetch(`${workerUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: spokenText,
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      console.error(`TTS error ${response.status}: ${await response.text()}`);
      finalizeInteraction();
      return;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    overlayWindow?.webContents.send('play-audio', {
      base64: audioBuffer.toString('base64'),
    });
    // finalizeInteraction is called when the overlay reports 'tts-finished'
  } catch (error) {
    console.error('TTS call failed:', error);
    finalizeInteraction();
  }
}

// ---------------------------------------------------------------------------
// Transcription via Worker
// ---------------------------------------------------------------------------

async function transcribeAudio(audioBase64: string): Promise<string> {
  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const response = await fetch(`${workerUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: audioBuffer,
    });

    if (!response.ok) {
      console.error(`Transcription error ${response.status}: ${await response.text()}`);
      return '';
    }

    const { transcript } = await response.json() as { transcript?: string };
    return transcript || '';
  } catch (error) {
    console.error('Transcription call failed:', error);
    return '';
  }
}

// ---------------------------------------------------------------------------
// PTT state machine
// ---------------------------------------------------------------------------

function startRecording(): void {
  if (companionState !== 'idle') return;
  companionState = 'recording';
  broadcastStateToPanel();
  showOverlay();
  startCursorTracking();
  overlayWindow?.webContents.send('ptt-start');
}

function stopRecording(): void {
  if (companionState !== 'recording') return;
  companionState = 'processing';
  broadcastStateToPanel();
  overlayWindow?.webContents.send('ptt-stop');
  // Audio arrives via the 'audio-ready' IPC message from the overlay
}

function finalizeInteraction(): void {
  companionState = 'idle';
  broadcastStateToPanel();
  stopCursorTracking();
  scheduleHideOverlay();
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  // --------------- Existing activity data handlers -------------------------
  ipcMain.handle('get-recent-activities', async (_event, limit: number = 50) => {
    try {
      return db.getRecentActivities(limit);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  });

  ipcMain.handle('get-activity-summary', async (_event, startTime: number, endTime: number) => {
    try {
      return db.getActivitySummary(startTime, endTime);
    } catch (error) {
      console.error('Error getting activity summary:', error);
      return [];
    }
  });

  ipcMain.handle('get-activities-by-time-range', async (_event, startTime: number, endTime: number) => {
    try {
      return db.getActivitiesByTimeRange(startTime, endTime);
    } catch (error) {
      console.error('Error getting activities by time range:', error);
      return [];
    }
  });

  // --------------- Panel configuration handlers ----------------------------
  ipcMain.on('set-worker-url', (_event, { url }: { url: string }) => {
    workerUrl = url;
    broadcastStateToPanel();
  });

  ipcMain.on('set-voice-enabled', (_event, { enabled }: { enabled: boolean }) => {
    voiceEnabled = enabled;
    broadcastStateToPanel();
  });

  ipcMain.on('set-model', (_event, { model }: { model: string }) => {
    selectedModel = model;
    broadcastStateToPanel();
  });

  ipcMain.on('clear-history', () => {
    conversationHistory = [];
    broadcastStateToPanel();
  });

  // Panel can also trigger PTT (for mouse users)
  ipcMain.on('trigger-ptt', () => {
    if (companionState === 'idle') {
      startRecording();
    } else if (companionState === 'recording') {
      stopRecording();
    }
  });

  ipcMain.handle('get-state', () => ({
    companionState,
    voiceEnabled,
    workerUrl,
    selectedModel,
    conversationTurns: Math.floor(conversationHistory.length / 2),
  }));

  // --------------- Overlay audio + transcript handlers ---------------------
  ipcMain.on(
    'audio-ready',
    async (_event, { base64 }: { base64: string }) => {
      if (companionState !== 'processing') return;

      try {
        // Capture screenshots while transcribing for minimal latency
        const [screenshots, transcript] = await Promise.all([
          captureScreenshots(),
          transcribeAudio(base64),
        ]);

        if (!transcript) {
          console.warn('Empty transcript — aborting AI request');
          companionState = 'idle';
          broadcastStateToPanel();
          overlayWindow?.webContents.send('recording-cancelled');
          scheduleHideOverlay();
          stopCursorTracking();
          return;
        }

        await callClaude(transcript, screenshots);
      } catch (error) {
        console.error('Error processing audio:', error);
        companionState = 'idle';
        broadcastStateToPanel();
        scheduleHideOverlay();
        stopCursorTracking();
      }
    }
  );

  ipcMain.on('tts-finished', () => {
    finalizeInteraction();
  });

  ipcMain.on('recording-cancelled', () => {
    if (companionState === 'recording' || companionState === 'processing') {
      companionState = 'idle';
      broadcastStateToPanel();
      scheduleHideOverlay();
      stopCursorTracking();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  // Allow the overlay renderer to use the microphone without a native dialog
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === 'media');
    }
  );

  // Keep the app alive on macOS even when all windows are hidden
  app.dock?.hide();

  // Initialise background services
  db = new ActivityDatabase();
  tracker = new ActivityTracker(db, 5000);
  await tracker.start();

  // Build the UI
  createTray();
  createPanelWindow();
  createOverlayWindow();

  // Register the push-to-talk toggle shortcut
  const pttShortcut = 'CommandOrControl+Shift+Space';
  globalShortcut.register(pttShortcut, () => {
    if (companionState === 'idle') {
      startRecording();
    } else if (companionState === 'recording') {
      stopRecording();
    }
  });

  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  // On macOS the app lives in the tray — never quit from window close
  if (process.platform !== 'darwin') {
    tracker?.stop();
    db?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  tracker?.stop();
  db?.close();
});
