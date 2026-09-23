import type { LiveServerMessage } from '@google/genai';
import type { ConnectLive, LiveLink } from './liveRoom';

/** Explicit ownership of the opening WebSocket allows cancellation before setupComplete. */
export const connectGemini: ConnectLive = (backend, handle, voice, callbacks, signal) => new Promise((resolve, reject) => {
  const url = new URL('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained');
  url.searchParams.set('access_token', backend.ephemeralToken);
  const socket = new WebSocket(url);
  socket.binaryType = 'arraybuffer';
  let ready = false;
  let finished = false;
  let inbox = Promise.resolve();
  const closeSocket = () => { try { socket.close(1000); } catch { /* socket may still be opening */ } };
  const finish = () => {
    finished = true;
    ready = false;
    signal?.removeEventListener('abort', abort);
  };
  const close = () => {
    if (finished) return;
    finish();
    reject(new Error('cancelled'));
    closeSocket();
  };
  const abort = close;
  const fail = (error: Error) => {
    if (finished) return;
    finish();
    reject(error);
    try { callbacks.onerror({ message: error.message }); } catch { /* The room owns callback errors. */ }
    closeSocket();
  };
  const link: LiveLink = {
    sendRealtimeInput(input) {
      if (finished || !ready || socket.readyState !== WebSocket.OPEN) throw new Error('socket_not_ready');
      if (socket.bufferedAmount > 256_000) throw new Error('socket_backpressure');
      socket.send(JSON.stringify({ realtimeInput: input }));
    },
    close,
  };
  signal?.addEventListener('abort', abort, { once: true });
  socket.onopen = () => {
    if (finished) return;
    if (signal?.aborted) { abort(); return; }
    try { socket.send(JSON.stringify({ setup: {
      model: backend.model.startsWith('models/') ? backend.model : `models/${backend.model}`,
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      } },
      inputAudioTranscription: {}, outputAudioTranscription: {},
      sessionResumption: handle ? { handle } : {},
      contextWindowCompression: { triggerTokens: '80000', slidingWindow: { targetTokens: '40000' } },
      realtimeInputConfig: { activityHandling: 'NO_INTERRUPTION', automaticActivityDetection: {
        disabled: false, startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', prefixPaddingMs: 100, silenceDurationMs: 600,
      } },
    } })); } catch { fail(new Error('socket_setup_failed')); }
  };
  socket.onmessage = (event) => {
    // Parse Blob/ArrayBuffer frames in receive order, even while the browser is resuming audio.
    inbox = inbox.then(async () => {
      if (signal?.aborted || finished) return;
      const raw = event.data instanceof Blob ? await event.data.text()
        : event.data instanceof ArrayBuffer ? new TextDecoder().decode(event.data) : String(event.data);
      if (signal?.aborted || finished) return;
      let decoded: unknown;
      try { decoded = JSON.parse(raw); } catch { throw new Error('invalid_live_message'); }
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('invalid_live_message');
      const message = decoded as LiveServerMessage & { error?: { code?: number; status?: string } };
      if (message.error) throw new Error(`Gemini_error_${message.error.code ?? message.error.status ?? 'unknown'}`);
      if (message.setupComplete) { ready = true; resolve(link); }
      callbacks.onmessage(message);
    }).catch((cause: unknown) => fail(cause instanceof Error ? cause : new Error('invalid_live_message')));
  };
  socket.onerror = () => fail(new Error('socket_error'));
  socket.onclose = (event) => {
    if (finished) return;
    finish();
    reject(new Error(`socket_closed_${event.code}`));
    callbacks.onclose({ code: event.code, reason: event.reason });
  };
  if (signal?.aborted) abort();
});
