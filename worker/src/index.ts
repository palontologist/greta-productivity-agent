/**
 * Greta Proxy Worker
 *
 * Proxies requests to Claude, ElevenLabs, and AssemblyAI APIs so the
 * Electron app never ships with raw API keys. Keys are stored as
 * Cloudflare secrets (set via `npx wrangler secret put`).
 *
 * Routes:
 *   POST /chat        → Anthropic Messages API (streaming SSE)
 *   POST /tts         → ElevenLabs TTS API
 *   POST /transcribe  → AssemblyAI batch transcription (upload + poll)
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;
  ASSEMBLYAI_API_KEY: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/chat") {
        return await handleChat(request, env);
      }
      if (url.pathname === "/tts") {
        return await handleTTS(request, env);
      }
      if (url.pathname === "/transcribe") {
        return await handleTranscribe(request, env);
      }
    } catch (error) {
      console.error(`[${url.pathname}] Unhandled error:`, error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

/**
 * Proxies to Claude's Messages API with streaming SSE passthrough.
 * The caller sends the full Anthropic messages request body.
 */
async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.text();

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body,
  });

  if (!anthropicResponse.ok) {
    const errorBody = await anthropicResponse.text();
    console.error(`[/chat] Anthropic API error ${anthropicResponse.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: anthropicResponse.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  // Stream the SSE response directly to the caller
  return new Response(anthropicResponse.body, {
    status: anthropicResponse.status,
    headers: {
      "content-type": anthropicResponse.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-cache",
      ...CORS_HEADERS,
    },
  });
}

/**
 * Proxies to ElevenLabs TTS API and streams the audio back.
 * The caller sends { text, model_id?, voice_settings? }.
 */
async function handleTTS(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const voiceId = env.ELEVENLABS_VOICE_ID;

  if (!voiceId) {
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_VOICE_ID is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }

  const elevenlabsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body,
    }
  );

  if (!elevenlabsResponse.ok) {
    const errorBody = await elevenlabsResponse.text();
    console.error(`[/tts] ElevenLabs API error ${elevenlabsResponse.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: elevenlabsResponse.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(elevenlabsResponse.body, {
    status: elevenlabsResponse.status,
    headers: {
      "content-type": elevenlabsResponse.headers.get("content-type") || "audio/mpeg",
      ...CORS_HEADERS,
    },
  });
}

/**
 * Transcribes audio using AssemblyAI's batch API.
 * Accepts raw audio bytes in the request body (audio/webm, audio/wav, etc.)
 * and returns { transcript: string } after polling for completion.
 */
async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  if (!env.ASSEMBLYAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ASSEMBLYAI_API_KEY is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }

  const audioBuffer = await request.arrayBuffer();

  // Step 1: Upload the audio file to AssemblyAI
  const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: env.ASSEMBLYAI_API_KEY,
      "content-type": "application/octet-stream",
    },
    body: audioBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(`[/transcribe] AssemblyAI upload error ${uploadResponse.status}: ${errorText}`);
    return new Response(JSON.stringify({ error: "Audio upload failed" }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const { upload_url } = await uploadResponse.json() as { upload_url: string };

  // Step 2: Request a transcription job
  const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: env.ASSEMBLYAI_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ audio_url: upload_url }),
  });

  if (!transcriptResponse.ok) {
    const errorText = await transcriptResponse.text();
    console.error(`[/transcribe] AssemblyAI transcript error ${transcriptResponse.status}: ${errorText}`);
    return new Response(JSON.stringify({ error: "Transcription request failed" }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const { id: transcriptId } = await transcriptResponse.json() as { id: string };

  // Step 3: Poll for completion (max ~20 seconds)
  const maxPolls = 10;
  const pollIntervalMs = 2000;

  for (let pollIndex = 0; pollIndex < maxPolls; pollIndex++) {
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));

    const statusResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { authorization: env.ASSEMBLYAI_API_KEY } }
    );

    const result = await statusResponse.json() as {
      status: "queued" | "processing" | "completed" | "error";
      text?: string;
      error?: string;
    };

    if (result.status === "completed") {
      return new Response(JSON.stringify({ transcript: result.text || "" }), {
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }

    if (result.status === "error") {
      console.error(`[/transcribe] AssemblyAI job error: ${result.error}`);
      return new Response(JSON.stringify({ error: result.error || "Transcription failed" }), {
        status: 500,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Transcription timed out" }), {
    status: 504,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
