// Panel renderer — controls the tray panel UI.

const api = window.gretaAPI;

// Detect platform for shortcut display
const isMac = navigator.platform.toUpperCase().includes('MAC');
document.getElementById('shortcut-display').textContent =
  isMac ? '⌘⇧Space' : 'Ctrl+Shift+Space';

// --------------------------------------------------------------------------
// PTT button
// --------------------------------------------------------------------------

function handlePTT() {
  api.triggerPTT();
}

// --------------------------------------------------------------------------
// Settings helpers
// --------------------------------------------------------------------------

function saveWorkerUrl(url) {
  api.setWorkerUrl(url.trim() || 'http://localhost:8787');
}

function saveModel(model) {
  api.setModel(model);
}

function saveVoice(enabled) {
  api.setVoiceEnabled(enabled);
}

function clearHistory() {
  if (confirm('Clear the entire conversation history with Greta?')) {
    api.clearHistory();
    document.getElementById('turn-count').textContent = '0 turns';
  }
}

// --------------------------------------------------------------------------
// State update handler — main → panel
// --------------------------------------------------------------------------

const STATE_CONFIG = {
  idle:       { icon: '💤', text: 'Idle — press the button or shortcut to talk', btnText: '🎙 Talk to Greta',  btnClass: '' },
  recording:  { icon: '🔴', text: 'Recording… press again or shortcut to stop', btnText: '⏹ Stop Recording', btnClass: 'recording' },
  processing: { icon: '⏳', text: 'Transcribing and thinking…',                  btnText: '⏳ Processing…',   btnClass: 'processing' },
  responding: { icon: '✨', text: 'Greta is responding…',                        btnText: '✨ Responding…',   btnClass: 'responding' },
};

function applyState(state) {
  const cfg = STATE_CONFIG[state.companionState] || STATE_CONFIG.idle;

  // Status bar
  document.getElementById('status-bar').querySelector('.status-icon').textContent = cfg.icon;
  document.getElementById('status-text').textContent = cfg.text;

  // Logo dot
  const dot = document.getElementById('logo-dot');
  dot.className = 'logo-dot ' + (state.companionState !== 'idle' ? state.companionState : '');

  // PTT button
  const btn = document.getElementById('ptt-btn');
  btn.textContent = cfg.btnText;
  btn.className = 'ptt-btn no-drag ' + cfg.btnClass;
  btn.disabled = state.companionState === 'processing' || state.companionState === 'responding';

  // Turn counter
  const turns = state.conversationTurns || 0;
  document.getElementById('turn-count').textContent = `${turns} turn${turns !== 1 ? 's' : ''}`;

  // Settings — sync values without triggering change events
  const workerInput = document.getElementById('worker-url');
  if (document.activeElement !== workerInput) {
    workerInput.value = state.workerUrl || 'http://localhost:8787';
  }

  const modelSelect = document.getElementById('model-select');
  if (state.selectedModel) modelSelect.value = state.selectedModel;

  document.getElementById('voice-toggle').checked = state.voiceEnabled !== false;
}

api.onStateUpdate(applyState);

// --------------------------------------------------------------------------
// Today's activity stats
// --------------------------------------------------------------------------

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h${minutes % 60}m` : `${minutes}m`;
}

async function loadTodayStats() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const summary = await api.getActivitySummary(startOfDay, Date.now());

    document.getElementById('stat-activities').textContent =
      summary.reduce((sum, item) => sum + item.count, 0);
    document.getElementById('stat-apps').textContent = summary.length;

    const totalMs = summary.reduce((sum, item) => sum + (item.totalTime || 0), 0);
    document.getElementById('stat-time').textContent = formatTime(totalMs);
  } catch (err) {
    console.error('Failed to load today stats:', err);
  }
}

// --------------------------------------------------------------------------
// Initialisation
// --------------------------------------------------------------------------

async function init() {
  // Fetch current state immediately
  const state = await api.getState();
  applyState(state);
  loadTodayStats();
}

// Refresh stats every 30 seconds
setInterval(loadTodayStats, 30000);

init();
