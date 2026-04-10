// Overlay renderer — handles PTT recording, response display, TTS playback,
// companion dot position, and cursor-pointing animations.

const overlayAPI = window.overlayAPI;

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------

const companionEl = document.getElementById('companion');
const responseBubbleEl = document.getElementById('response-bubble');
const waveformEl = document.getElementById('waveform');

// ---------------------------------------------------------------------------
// Companion dot position
// ---------------------------------------------------------------------------

let companionX = window.screen.width / 2;
let companionY = window.screen.height / 2;

function moveTo(x, y, durationMs = 50) {
  companionEl.style.transition = `left ${durationMs}ms linear, top ${durationMs}ms linear, opacity 0.3s ease`;
  companionEl.style.left = x + 'px';
  companionEl.style.top = y + 'px';
  companionX = x;
  companionY = y;
  updateBubblePosition();
}

function updateBubblePosition() {
  // Position the response bubble above and slightly right of the companion dot.
  // Clamp so it never goes off-screen.
  const bubbleWidth = 380;
  const bubbleHeight = 120; // approximate
  const margin = 20;
  const offsetX = 10;
  const offsetY = -bubbleHeight - 20;

  let bx = companionX + offsetX;
  let by = companionY + offsetY;

  bx = Math.max(margin, Math.min(bx, window.screen.width - bubbleWidth - margin));
  by = Math.max(margin, by);

  responseBubbleEl.style.left = bx + 'px';
  responseBubbleEl.style.top = by + 'px';
}

// ---------------------------------------------------------------------------
// Show / hide the full overlay
// ---------------------------------------------------------------------------

function showOverlay() {
  document.body.style.opacity = '1';
  companionEl.classList.add('visible');
}

function hideOverlay() {
  // Fade everything out
  companionEl.classList.remove('visible');
  responseBubbleEl.classList.remove('visible');
  waveformEl.classList.remove('visible');
  responseBubbleEl.textContent = '';
  companionEl.className = 'visible'; // reset state classes (keep invisible until next show)
  companionEl.classList.remove('visible');
}

// ---------------------------------------------------------------------------
// Audio recording via MediaRecorder
// ---------------------------------------------------------------------------

let mediaRecorder = null;
let audioChunks = [];
let recordingStream = null;

async function startRecording() {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Release the mic stream
      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
      }

      if (audioChunks.length === 0) {
        overlayAPI.sendRecordingCancelled();
        return;
      }

      // Convert to base64 and send to main process
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // Build base64 without using btoa on large buffers (avoid stack overflow)
      const base64 = bufferToBase64(uint8Array);
      overlayAPI.sendAudioReady(base64);
    };

    mediaRecorder.start(250); // collect data every 250 ms
    console.log('[overlay] Recording started');
  } catch (error) {
    console.error('[overlay] Failed to start recording:', error);
    overlayAPI.sendRecordingCancelled();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('[overlay] Recording stopped');
  }
}

// Efficient base64 encoding for large ArrayBuffers
function bufferToBase64(uint8Array) {
  const chunkSize = 0x8000; // 32 KB at a time
  let binaryString = '';
  for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
    const chunk = uint8Array.subarray(offset, offset + chunkSize);
    binaryString += String.fromCharCode(...chunk);
  }
  return btoa(binaryString);
}

// ---------------------------------------------------------------------------
// TTS playback via Web Audio API
// ---------------------------------------------------------------------------

let audioContext = null;
let currentAudioSource = null;

function playAudioBase64(base64AudioString) {
  // Decode base64 to binary
  const binaryString = atob(base64AudioString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
    if (currentAudioSource) {
      currentAudioSource.stop();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      waveformEl.classList.remove('visible');
      overlayAPI.sendTTSFinished();
    };

    currentAudioSource = source;
    waveformEl.classList.add('visible');
    source.start(0);
  }, (error) => {
    console.error('[overlay] Audio decode error:', error);
    waveformEl.classList.remove('visible');
    overlayAPI.sendTTSFinished();
  });
}

// ---------------------------------------------------------------------------
// Response text display
// ---------------------------------------------------------------------------

let accumulatedText = '';

function appendResponseText(chunk) {
  accumulatedText += chunk;
  // Strip [POINT:...] tags from the displayed text
  const displayText = accumulatedText.replace(/\[POINT:[^\]]+\]/g, '').trim();
  responseBubbleEl.textContent = displayText;
  responseBubbleEl.classList.add('visible');
  updateBubblePosition();
}

function showFullResponse(fullText) {
  const displayText = fullText.replace(/\[POINT:[^\]]+\]/g, '').trim();
  responseBubbleEl.textContent = displayText;
  responseBubbleEl.classList.add('visible');
  updateBubblePosition();
}

// ---------------------------------------------------------------------------
// Point-to animation — companion flies to the given screen coordinate
// ---------------------------------------------------------------------------

function animatePointTo(x, y, label) {
  // Fly the companion to the target with a smooth bezier-style transition
  companionEl.style.transition = 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
  companionEl.style.left = x + 'px';
  companionEl.style.top = y + 'px';
  companionX = x;
  companionY = y;

  // Show a small label annotation at the target
  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'point-label';
    labelEl.textContent = label;
    labelEl.style.left = x + 'px';
    labelEl.style.top = y + 'px';
    document.body.appendChild(labelEl);
    // Remove after animation finishes
    labelEl.addEventListener('animationend', () => labelEl.remove());
  }

  // Update bubble position after the companion moves
  setTimeout(updateBubblePosition, 650);
}

// ---------------------------------------------------------------------------
// IPC event bindings
// ---------------------------------------------------------------------------

overlayAPI.onShow(() => {
  showOverlay();
});

overlayAPI.onHide(() => {
  hideOverlay();
});

overlayAPI.onPTTStart(() => {
  accumulatedText = '';
  responseBubbleEl.classList.remove('visible');
  responseBubbleEl.textContent = '';
  companionEl.className = 'visible recording'; // red pulsing ring
  startRecording();
});

overlayAPI.onPTTStop(() => {
  companionEl.className = 'visible processing'; // orange spinning
  stopRecording(); // triggers onstop → sendAudioReady
});

overlayAPI.onRecordingCancelled(() => {
  stopRecording();
  companionEl.className = 'visible';
  hideOverlay();
});

overlayAPI.onCursorPosition(({ x, y }) => {
  moveTo(x, y, 50);
});

overlayAPI.onResponseChunk(({ text }) => {
  // Switch to responding state on first chunk
  if (!accumulatedText) {
    companionEl.className = 'visible'; // blue dot, no special state
  }
  appendResponseText(text);
});

overlayAPI.onResponseComplete(({ fullText }) => {
  showFullResponse(fullText);
});

overlayAPI.onResponseError(({ message }) => {
  responseBubbleEl.textContent = '⚠ ' + message;
  responseBubbleEl.classList.add('visible');
  setTimeout(hideOverlay, 3000);
});

overlayAPI.onPlayAudio(({ base64 }) => {
  playAudioBase64(base64);
});

overlayAPI.onPointTo(({ x, y, label }) => {
  animatePointTo(x, y, label);
});

// ---------------------------------------------------------------------------
// Initialisation — position the companion dot off-screen to start
// ---------------------------------------------------------------------------

moveTo(-100, -100, 0);
