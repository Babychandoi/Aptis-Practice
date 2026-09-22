import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EndSensitivity, GoogleGenAI, Modality, StartSensitivity,
  type LiveServerMessage, type Session,
} from '@google/genai';
import { aiConversationApi, type AiConversationSession } from '@/api/endpoints';

export type ConversationStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'handoff' | 'error';
export interface TranscriptLine { role: 'user' | 'ai'; text: string; }

export function useGeminiLiveConversation(topic: string, level: string, voice: string) {
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const recordContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const playbackAtRef = useRef(0);
  const backendSessionRef = useRef<AiConversationSession | null>(null);
  const timerRef = useRef<number | null>(null);
  const handoffRef = useRef<number | null>(null);
  const inputTokensRef = useRef(0);
  const outputTokensRef = useRef(0);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const runningRef = useRef(false);
  const resumptionHandleRef = useRef<string | undefined>(undefined);
  const connectStartedAtRef = useRef(0);
  const connectLatencyMsRef = useRef<number | undefined>(undefined);
  const reconnectCountRef = useRef(0);
  const disconnectCountRef = useRef(0);
  const rateLimitCountRef = useRef(0);
  const reconnectingRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  // Không gửi mic lên Gemini trong lúc AI đang phát tiếng. Việc này ngăn echo từ loa
  // hoặc người dùng nói chồng làm Native Audio hiểu là barge-in và cắt ngang câu trả lời.
  const aiSpeakingRef = useRef(false);
  const modelTurnCompleteRef = useRef(true);
  const micResumeTimerRef = useRef<number | null>(null);
  // Số lượt đã đẩy về backend. Transcript phía trước mốc này coi như đã lưu,
  // nên gọi lại nhiều lần cũng không gửi trùng.
  const savedTurnCountRef = useRef(0);
  const flushingRef = useRef(false);
  // handleMessage khai báo trước flushTurns nên gọi qua ref, tránh vòng phụ thuộc
  // giữa hai useCallback.
  const flushTurnsRef = useRef<((sessionId: string, includeLast?: boolean) => void) | null>(null);

  const appendTranscript = useCallback((role: 'user' | 'ai', text?: string) => {
    const clean = text?.trim();
    if (!clean) return;
    setTranscript((current) => {
      const last = current.at(-1);
      const merged = last?.role === role
        ? clean.startsWith(last.text) ? clean
          : last.text.endsWith(clean) ? last.text
          : `${last.text}${needsSpace(last.text, clean) ? ' ' : ''}${clean}`
        : clean;
      const next = last?.role === role
        ? [...current.slice(0, -1), { role, text: merged }]
        : [...current, { role, text: clean }];
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const stopPlayback = useCallback(() => {
    if (micResumeTimerRef.current) window.clearTimeout(micResumeTimerRef.current);
    micResumeTimerRef.current = null;
    playbackSourcesRef.current.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
    playbackSourcesRef.current.clear();
    playbackAtRef.current = 0;
    aiSpeakingRef.current = false;
    modelTurnCompleteRef.current = true;
  }, []);

  const resumeMicWhenReady = useCallback(() => {
    if (!modelTurnCompleteRef.current || playbackSourcesRef.current.size > 0) return;
    if (micResumeTimerRef.current) window.clearTimeout(micResumeTimerRef.current);
    micResumeTimerRef.current = window.setTimeout(() => {
      if (!modelTurnCompleteRef.current || playbackSourcesRef.current.size > 0) return;
      aiSpeakingRef.current = false;
      micResumeTimerRef.current = null;
      if (runningRef.current) setStatus('listening');
    }, 600);
  }, []);

  const playPcm = useCallback(async (base64: string) => {
    if (micResumeTimerRef.current) window.clearTimeout(micResumeTimerRef.current);
    micResumeTimerRef.current = null;
    aiSpeakingRef.current = true;
    const context = playbackContextRef.current ?? new AudioContext({ sampleRate: 24_000 });
    playbackContextRef.current = context;
    if (context.state === 'suspended') await context.resume();
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const samples = new Float32Array(Math.floor(bytes.length / 2));
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
    const buffer = context.createBuffer(1, samples.length, 24_000);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime + 0.02, playbackAtRef.current);
    source.start(startAt);
    playbackAtRef.current = startAt + buffer.duration;
    playbackSourcesRef.current.add(source);
    source.onended = () => {
      playbackSourcesRef.current.delete(source);
      resumeMicWhenReady();
    };
    setStatus('speaking');
  }, [resumeMicWhenReady]);

  const handleMessage = useCallback((message: LiveServerMessage) => {
    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) {
      resumptionHandleRef.current = message.sessionResumptionUpdate.newHandle;
    }
    const content = message.serverContent;
    if (content?.interrupted) stopPlayback();
    appendTranscript('user', content?.inputTranscription?.text);
    appendTranscript('ai', content?.outputTranscription?.text);
    const audioParts = content?.modelTurn?.parts ?? [];
    if (audioParts.some((part) => part.inlineData?.data)) modelTurnCompleteRef.current = false;
    for (const part of audioParts) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) void playPcm(part.inlineData.data);
    }
    if (content?.turnComplete) {
      modelTurnCompleteRef.current = true;
      resumeMicWhenReady();
      // Lượt vừa khép lại là mốc an toàn để lưu: transcript phía trước sẽ không
      // còn được ghi thêm nữa.
      const sessionId = backendSessionRef.current?.sessionId;
      if (sessionId) flushTurnsRef.current?.(sessionId);
    }
    const usage = message.usageMetadata;
    if (usage) {
      inputTokensRef.current = usage.promptTokenCount ?? inputTokensRef.current;
      outputTokensRef.current = usage.responseTokenCount ?? outputTokensRef.current;
    }
  }, [appendTranscript, playPcm, resumeMicWhenReady, stopPlayback]);

  /**
   * Đẩy các lượt chưa lưu về backend.
   *
   * <p>Gọi mỗi khi AI nói xong một lượt, nên mất tab hay rớt mạng cũng chỉ mất
   * lượt đang dở. Lượt cuối cùng có thể còn đang được ghi tiếp nên giữ lại,
   * chờ lần chốt sau — chỉ khi kết thúc hẳn mới đẩy nốt.
   */
  const flushTurns = useCallback(async (sessionId: string, includeLast = false) => {
    if (flushingRef.current) return;
    const all = transcriptRef.current;
    const upTo = includeLast ? all.length : all.length - 1;
    if (upTo <= savedTurnCountRef.current) return;
    const pending = all.slice(savedTurnCountRef.current, upTo)
      .map((line, index) => ({
        role: line.role,
        content: line.text,
        seq: savedTurnCountRef.current + index,
      }));
    if (!pending.length) return;
    flushingRef.current = true;
    try {
      await aiConversationApi.saveTurns(sessionId, pending);
      savedTurnCountRef.current += pending.length;
    } catch {
      // Lưu hụt một lô không được làm hỏng cuộc nói chuyện; lô sau gửi lại từ
      // đúng mốc cũ vì savedTurnCountRef chưa tăng.
    } finally {
      flushingRef.current = false;
    }
  }, []);

  flushTurnsRef.current = (sessionId, includeLast) => void flushTurns(sessionId, includeLast);

  const persistSummary = useCallback(async (sessionId: string) => {
    // Đẩy nốt cả lượt cuối: đây là lúc phiên kết thúc hoặc chuyển giao, không
    // còn gì ghi thêm nữa nên giữ lại là mất.
    await flushTurns(sessionId, true);
    // Nội dung nhớ nay do backend tóm tắt từ các lượt đã lưu. Client chỉ còn
    // gửi số liệu vận hành và vài dòng cuối làm mốc chuyển giao nhanh, khỏi chờ
    // LLM tóm tắt xong mới nối được phiên mới.
    const summary = JSON.stringify({
      current_topic: topic,
      learner_level: level,
      recent_conversation: transcriptRef.current.slice(-8),
    });
    await aiConversationApi.saveSummary(sessionId, {
      summary, inputTokens: inputTokensRef.current, outputTokens: outputTokensRef.current,
      connectLatencyMs: connectLatencyMsRef.current,
      reconnectCount: reconnectCountRef.current,
      disconnectCount: disconnectCountRef.current,
      rateLimitCount: rateLimitCountRef.current,
    });
  }, [flushTurns, level, topic]);

  const stopAudioInput = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    void recordContextRef.current?.close();
    recordContextRef.current = null;
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (handoffRef.current) window.clearTimeout(handoffRef.current);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    timerRef.current = null;
    handoffRef.current = null;
    reconnectTimerRef.current = null;
  }, []);

  const connect = useCallback(async (previousSessionId?: string, resumptionHandle?: string) => {
    setStatus(previousSessionId ? 'handoff' : 'connecting');
    setError(null);
    connectStartedAtRef.current = performance.now();
    const backend = await aiConversationApi.createSession({ topic, level, voice, previousSessionId, resumptionHandle });
    const ai = new GoogleGenAI({ apiKey: backend.ephemeralToken, httpOptions: { apiVersion: 'v1beta' } });
    let live: Session;
    try {
      live = await ai.live.connect({
      model: backend.model,
      config: {
        responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
            prefixPaddingMs: 100,
            silenceDurationMs: 300,
          },
        },
        sessionResumption: resumptionHandle ? { handle: resumptionHandle } : {},
        contextWindowCompression: { triggerTokens: '80000', slidingWindow: { targetTokens: '40000' } },
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
      callbacks: {
        onmessage: handleMessage,
        onerror: (event) => {
          const message = event.message || 'Kết nối Gemini Live gặp lỗi';
          if (/429|quota|rate.?limit/i.test(message)) rateLimitCountRef.current += 1;
          if (!runningRef.current || sessionRef.current !== live) return;
          setStatus('connecting');
          setError('Kết nối AI bị gián đoạn, đang tự khôi phục…');
          // Một số lỗi của Live API không phát tiếp sự kiện close.
          window.setTimeout(() => {
            if (runningRef.current && sessionRef.current === live) live.close();
          }, 0);
        },
        onclose: () => {
          if (!runningRef.current || sessionRef.current !== live) return;
          disconnectCountRef.current += 1;
          setStatus('connecting');
          if (reconnectingRef.current) return;
          reconnectingRef.current = true;
          reconnectTimerRef.current = window.setTimeout(async () => {
            let attempt = 0;
            // Tự thử lại liên tục với backoff, giữ nguyên transcript và resumption handle.
            while (runningRef.current && sessionRef.current === live) {
              try {
                attempt += 1;
                reconnectCountRef.current += 1;
                if (attempt === 1) {
                  try { await persistSummary(backend.sessionId); } catch { /* reconnect must continue */ }
                }
                await connect(backend.sessionId, resumptionHandleRef.current);
                setError(null);
                break;
              } catch (cause) {
                if (!runningRef.current) break;
                const message = cause instanceof Error ? cause.message : '';
                if (/429|quota|rate.?limit/i.test(message)) rateLimitCountRef.current += 1;
                setStatus('connecting');
                setError(`Kết nối AI bị gián đoạn, đang thử lại lần ${attempt + 1}…`);
                await delay(Math.min(8_000, 1_000 * (2 ** Math.min(attempt - 1, 3))));
              }
            }
            reconnectTimerRef.current = null;
            reconnectingRef.current = false;
          }, 750);
        },
      },
      });
    } catch (cause) {
      await aiConversationApi.closeSession(backend.sessionId, cause instanceof Error ? cause.message : 'Gemini connection failed');
      throw cause;
    }
    const oldLive = sessionRef.current;
    const oldBackend = backendSessionRef.current;
    sessionRef.current = live;
    backendSessionRef.current = backend;
    // Phiên mới đánh seq lại từ 0. Transcript trên màn hình vẫn liền mạch, nhưng
    // phần trước đã lưu vào phiên cũ rồi nên mốc phải về đúng độ dài hiện tại,
    // không phải 0 — nếu không lượt cũ sẽ bị ghi lại lần nữa vào phiên mới.
    if (oldBackend && oldBackend.sessionId !== backend.sessionId) {
      savedTurnCountRef.current = transcriptRef.current.length;
    }
    connectLatencyMsRef.current = Math.round(performance.now() - connectStartedAtRef.current);
    oldLive?.close();
    if (oldBackend) void aiConversationApi.closeSession(oldBackend.sessionId);

    if (!mediaRef.current) mediaRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    processorRef.current?.disconnect();
    if (recordContextRef.current && recordContextRef.current.state !== 'closed') {
      await recordContextRef.current.close();
    }
    const context = new AudioContext();
    recordContextRef.current = context;
    const source = context.createMediaStreamSource(mediaRef.current);
    const processor = context.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (event) => {
      if (!runningRef.current || sessionRef.current !== live || aiSpeakingRef.current) return;
      const pcm = downsampleToPcm16(event.inputBuffer.getChannelData(0), context.sampleRate, 16_000);
      try {
        live.sendRealtimeInput({ audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } });
      } catch {
        // SDK có thể chỉ lộ socket chết tại lần gửi audio kế tiếp.
        if (sessionRef.current === live) live.close();
      }
    };
    source.connect(processor);
    processor.connect(context.destination);
    runningRef.current = true;
    setStatus('listening');
    clearTimers();
    const expiry = new Date(backend.expiresAt).getTime();
    timerRef.current = window.setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000))), 1000);
    if (backend.handoffSecondsBeforeExpiry > 0) {
      const handoffDelay = Math.max(5_000, expiry - Date.now() - backend.handoffSecondsBeforeExpiry * 1000);
      handoffRef.current = window.setTimeout(async () => {
        try { await persistSummary(backend.sessionId); await connect(backend.sessionId); }
        catch { setError('Không thể chuyển sang phiên tiếp theo'); setStatus('error'); }
      }, handoffDelay);
    } else {
      handoffRef.current = window.setTimeout(async () => {
        runningRef.current = false;
        stopPlayback();
        stopAudioInput();
        live.close();
        try { await persistSummary(backend.sessionId); await aiConversationApi.closeSession(backend.sessionId); } catch { /* best effort */ }
        sessionRef.current = null;
        backendSessionRef.current = null;
        setSecondsLeft(0);
        setStatus('idle');
        setError('Bạn đã dùng hết thời lượng AI Voice hôm nay. Hạn mức sẽ được đặt lại lúc 00:00.');
      }, Math.max(1_000, expiry - Date.now()));
    }
  }, [clearTimers, handleMessage, level, persistSummary, stopAudioInput, stopPlayback, topic, voice]);

  const start = useCallback(async () => {
    inputTokensRef.current = 0;
    outputTokensRef.current = 0;
    connectLatencyMsRef.current = undefined;
    reconnectCountRef.current = 0;
    disconnectCountRef.current = 0;
    rateLimitCountRef.current = 0;
    resumptionHandleRef.current = undefined;
    aiSpeakingRef.current = false;
    modelTurnCompleteRef.current = true;
    savedTurnCountRef.current = 0;
    try { runningRef.current = true; await connect(); }
    catch (cause) { runningRef.current = false; setStatus('error'); setError(cause instanceof Error ? cause.message : 'Không thể bắt đầu hội thoại'); }
  }, [connect]);

  const stop = useCallback(async () => {
    runningRef.current = false;
    clearTimers();
    stopPlayback();
    stopAudioInput();
    sessionRef.current?.close();
    sessionRef.current = null;
    const backend = backendSessionRef.current;
    backendSessionRef.current = null;
    if (backend) {
      try { await persistSummary(backend.sessionId); await aiConversationApi.closeSession(backend.sessionId); } catch { /* best effort */ }
    }
    setStatus('idle');
    setSecondsLeft(0);
  }, [clearTimers, persistSummary, stopAudioInput, stopPlayback]);

  useEffect(() => () => {
    runningRef.current = false;
    clearTimers();
    stopAudioInput();
    stopPlayback();
    sessionRef.current?.close();
    const backend = backendSessionRef.current;
    sessionRef.current = null;
    backendSessionRef.current = null;
    if (backend) void aiConversationApi.closeSession(backend.sessionId);
  }, [clearTimers, stopAudioInput, stopPlayback]);
  return { status, transcript, secondsLeft, error, start, stop };
}

function downsampleToPcm16(input: Float32Array, inputRate: number, outputRate: number) {
  const ratio = inputRate / outputRate;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio), end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0; for (let j = start; j < end; j += 1) sum += input[j] ?? 0;
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}
function bytesToBase64(bytes: Uint8Array) { let value = ''; for (let i = 0; i < bytes.length; i += 1) value += String.fromCharCode(bytes[i] ?? 0); return btoa(value); }
function needsSpace(left: string, right: string) {
  return /[\p{L}\p{N}]$/u.test(left) && /^[\p{L}\p{N}]/u.test(right);
}
function delay(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }
