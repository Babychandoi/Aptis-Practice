import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiConversationSession } from '@/api/endpoints';
import type { VoiceAudio } from './liveAudio';
import { LiveConversationRoom, type ConnectLive, type LiveCallbacks, type LiveLink } from './liveRoom';

vi.mock('@/api/endpoints', () => ({ aiConversationApi: {} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
const options = { topic: 'Daily life', level: 'B1', voice: 'Aoede' };
const rooms: LiveConversationRoom[] = [];

function harness() {
  const session: AiConversationSession = {
    sessionId: 'room-1', ephemeralToken: 'temporary', model: 'test-model',
    startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    tokenStartExpiresAt: new Date(Date.now() + 60_000).toISOString(), handoffSecondsBeforeExpiry: 30,
    historyRevision: 0, history: [],
  };
  let pcm!: (data: string) => void;
  let drained!: () => void;
  const audio: VoiceAudio = {
    playing: false,
    start: vi.fn(async (onPcm, _error, onDrained) => { pcm = onPcm; drained = onDrained; }),
    stop: vi.fn(), resume: vi.fn(async () => {}), setMuted: vi.fn(),
    play: vi.fn(() => { Object.assign(audio, { playing: true }); }),
    clearPlayback: vi.fn(() => { Object.assign(audio, { playing: false }); drained(); }),
  };
  const api = {
    createSession: vi.fn(async () => ({ ...session })),
    reconnectSession: vi.fn(async () => ({ ...session })),
    saveHistory: vi.fn(async () => ({})), saveSummary: vi.fn(async () => ({})), closeSession: vi.fn(async () => ({})),
  };
  const calls: { callbacks: LiveCallbacks; link: LiveLink; signal?: AbortSignal; handle?: string }[] = [];
  const connect = vi.fn<ConnectLive>(async (_session, handle, _voice, callbacks, signal) => {
    const link: LiveLink = { sendRealtimeInput: vi.fn(), close: vi.fn() };
    calls.push({ callbacks, link, signal, handle });
    return link;
  });
  let online = true;
  const room = new LiveConversationRoom({ api: api as never, audio, connect, online: () => online });
  rooms.push(room);
  return { room, api, audio, session, calls, connect,
    pcm: (data = btoa('\x00\x20'.repeat(320))) => pcm(data),
    drain: () => { Object.assign(audio, { playing: false }); drained(); },
    offline: () => { online = false; room.networkChanged(); },
    online: () => { online = true; room.networkChanged(); },
  };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-23T08:00:00Z')); vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(async () => {
  await Promise.all(rooms.splice(0).map((room) => room.stop()));
  vi.useRealTimers(); vi.restoreAllMocks();
});

describe('room recovery', () => {
  it('merges raw word fragments, preserving spaces, and orders late learner transcription before AI', async () => {
    const h = harness(); await h.room.start(options);
    const message = h.calls[0]!.callbacks.onmessage;
    message({ serverContent: { outputTranscription: { text: 'Hel' } } });
    message({ serverContent: { outputTranscription: { text: 'lo ' } } });
    message({ serverContent: { inputTranscription: { text: 'Hi there' }, outputTranscription: { text: 'there!' } } });
    message({ serverContent: { turnComplete: true } });
    expect(h.room.getSnapshot().transcript.map(({ role, text }) => ({ role, text }))).toEqual([
      { role: 'user', text: 'Hi there' }, { role: 'ai', text: 'Hello there!' },
    ]);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.api.saveHistory).toHaveBeenCalledWith('room-1', expect.objectContaining({ revision: 4 }));
  });

  it('resumes the same backend room and microphone and sends full history beyond eight turns', async () => {
    const h = harness(); await h.room.start(options);
    const message = h.calls[0]!.callbacks.onmessage;
    for (let i = 0; i < 20; i++) message({ serverContent: {
      inputTranscription: { text: `question ${i}` }, outputTranscription: { text: `answer ${i}` }, turnComplete: true,
    } });
    message({ sessionResumptionUpdate: { resumable: true, newHandle: 'checkpoint' } });
    h.calls[0]!.callbacks.onclose({ code: 1011 }); await settle();
    expect(h.api.createSession).toHaveBeenCalledTimes(1);
    expect(h.api.reconnectSession).toHaveBeenCalledWith('room-1', expect.objectContaining({ resumptionHandle: 'checkpoint', forceNew: false }));
    expect((h.api.reconnectSession.mock.calls[0] as unknown as [string, { history: unknown[] }])[1].history).toHaveLength(40);
    expect(h.calls[1]!.handle).toBe('checkpoint');
    expect(h.audio.start).toHaveBeenCalledTimes(1);
    expect(h.api.closeSession).not.toHaveBeenCalled();
  });

  it('falls back to fresh full-context setup after rejected resumption', async () => {
    const h = harness(); await h.room.start(options);
    h.calls[0]!.callbacks.onmessage({ sessionResumptionUpdate: { resumable: true, newHandle: 'old' } });
    h.connect.mockRejectedValueOnce(new Error('invalid handle'));
    h.calls[0]!.callbacks.onclose({}); await settle();
    await vi.advanceTimersByTimeAsync(751);
    expect(h.connect).toHaveBeenCalledTimes(3);
    expect(h.api.reconnectSession).toHaveBeenLastCalledWith('room-1', expect.objectContaining({ forceNew: true, resumptionHandle: undefined }));
    expect(h.calls[1]!.handle).toBeUndefined();
  });

  it('does not restore a stale checkpoint while the model declares it non-resumable', async () => {
    const h = harness(); await h.room.start(options);
    const message = h.calls[0]!.callbacks.onmessage;
    message({ sessionResumptionUpdate: { resumable: true, newHandle: 'old' } });
    message({ sessionResumptionUpdate: { resumable: false } });
    h.calls[0]!.callbacks.onclose({}); await settle();
    expect(h.api.reconnectSession).toHaveBeenCalledWith('room-1', expect.objectContaining({ forceNew: true, resumptionHandle: undefined }));
  });

  it('retries close before setupComplete instead of hanging on connect()', async () => {
    const h = harness();
    let early!: LiveCallbacks;
    h.connect.mockImplementationOnce((_s, _h, _v, callbacks) => { early = callbacks; return new Promise(() => {}); });
    const start = h.room.start(options); await settle();
    early.onclose({ code: 1011 }); await settle();
    await vi.advanceTimersByTimeAsync(751); await start;
    expect(h.connect).toHaveBeenCalledTimes(2);
  });

  it('aborts stalled handshakes after timeout and closes a late-resolving socket', async () => {
    const h = harness(); const pending = deferred<LiveLink>(); let signal: AbortSignal | undefined;
    h.connect.mockImplementationOnce((_s, _h, _v, _c, abort) => { signal = abort; return pending.promise; });
    const start = h.room.start(options); await settle();
    await vi.advanceTimersByTimeAsync(12_001);
    expect(signal?.aborted).toBe(true);
    const late = { close: vi.fn(), sendRealtimeInput: vi.fn() }; pending.resolve(late); await settle();
    expect(late.close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(750); await start;
    expect(h.connect).toHaveBeenCalledTimes(2);
  });

  it('closes an orphan backend lease created after the user already left', async () => {
    const h = harness(); const pending = deferred<AiConversationSession>();
    h.api.createSession.mockReturnValueOnce(pending.promise);
    const start = h.room.start(options); await settle(); await h.room.stop();
    pending.resolve(h.session); await start;
    expect(h.api.closeSession).toHaveBeenCalledWith('room-1');
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.room.getSnapshot().status).toBe('idle');
  });

  it('unlocks mic after buffered speaker audio drains despite missing turnComplete', async () => {
    const h = harness(); await h.room.start(options); await vi.advanceTimersByTimeAsync(400);
    h.calls[0]!.callbacks.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] } } });
    expect(h.audio.setMuted).toHaveBeenLastCalledWith(true);
    h.calls[0]!.callbacks.onclose({}); await settle();
    expect(h.audio.clearPlayback).not.toHaveBeenCalled();
    h.drain(); await vi.advanceTimersByTimeAsync(401);
    expect(h.audio.setMuted).toHaveBeenLastCalledWith(false);
    expect(h.room.getSnapshot().status).toBe('listening');
  });

  it('ignores late callbacks from replaced sockets', async () => {
    const h = harness(); await h.room.start(options);
    const old = h.calls[0]!.callbacks;
    old.onclose({}); await settle();
    old.onmessage({ serverContent: { outputTranscription: { text: 'stale' } } });
    old.onerror({}); await settle();
    expect(h.room.getSnapshot().transcript).toEqual([]);
    expect(h.connect).toHaveBeenCalledTimes(2);
  });

  it('closes the room even when both persistence requests fail', async () => {
    const h = harness(); await h.room.start(options);
    h.api.saveHistory.mockRejectedValue(new Error('offline')); h.api.saveSummary.mockRejectedValue(new Error('offline'));
    await h.room.stop();
    expect(h.api.closeSession).toHaveBeenCalledWith('room-1');
    expect(h.audio.stop).toHaveBeenCalled();
    expect(h.calls[0]!.signal?.aborted).toBe(true);
  });

  it('stays in the room offline, buffers unsent speech, and recovers on network return', async () => {
    const h = harness(); await h.room.start(options); await vi.advanceTimersByTimeAsync(400);
    h.offline(); await vi.advanceTimersByTimeAsync(401); h.pcm();
    expect(h.api.reconnectSession).not.toHaveBeenCalled();
    expect(h.room.getSnapshot().status).toBe('reconnecting');
    h.online(); await settle();
    expect(h.audio.start).toHaveBeenCalledTimes(1);
    expect(h.calls[1]!.link.sendRealtimeInput).toHaveBeenCalledWith(expect.objectContaining({ audio: expect.anything() }));
  });

  it('rolls over GoAway at a quiet checkpoint without closing the backend room', async () => {
    const h = harness(); await h.room.start(options);
    h.calls[0]!.callbacks.onmessage({ sessionResumptionUpdate: { resumable: true, newHandle: 'quiet' }, goAway: { timeLeft: '20s' } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.connect).toHaveBeenCalledTimes(2);
    expect(h.api.closeSession).not.toHaveBeenCalled();
  });

  it('does not mistake learner silence for a hung connection', async () => {
    const h = harness(); await h.room.start(options);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.connect).toHaveBeenCalledTimes(1);
  });

  it('honors quota backoff and terminal access errors', async () => {
    const h = harness(); await h.room.start(options);
    h.api.reconnectSession.mockRejectedValueOnce({ status: 429 });
    h.calls[0]!.callbacks.onclose({}); await settle();
    await vi.advanceTimersByTimeAsync(59_000);
    expect(h.api.reconnectSession).toHaveBeenCalledTimes(1);
    h.api.reconnectSession.mockRejectedValueOnce({ status: 403, message: 'access revoked' });
    await vi.advanceTimersByTimeAsync(1001);
    expect(h.room.getSnapshot().error).toBe('access revoked');
    expect(h.room.getSnapshot().status).toBe('error');
    expect(h.api.closeSession).toHaveBeenCalled();
  });

  it('honors a provider429 after setup even if network/visibility events wake the retry', async () => {
    const h = harness(); await h.room.start(options);
    h.calls[0]!.callbacks.onerror({ message: 'Gemini_error_429' }); await settle();
    h.online(); h.room.resumeAudio(); await settle();
    await vi.advanceTimersByTimeAsync(59_000);
    expect(h.api.reconnectSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1001);
    expect(h.api.reconnectSession).toHaveBeenCalledTimes(1);
  });

  it('paces a ten-second microphone backlog without overflowing socket backpressure', async () => {
    const h = harness(); await h.room.start(options); await vi.advanceTimersByTimeAsync(400);
    h.offline(); await vi.advanceTimersByTimeAsync(401);
    const data = btoa('\x00\x20'.repeat(1600));
    for (let i = 0; i < 100; i++) h.pcm(data);
    let queuedBytes = 0;
    const send = vi.fn((input: { audio?: { data: string } }) => {
      if (!input.audio) return;
      queuedBytes += input.audio.data.length;
      if (queuedBytes > 256_000) throw new Error('socket_backpressure');
      setTimeout(() => { queuedBytes = 0; }, 1);
    });
    h.connect.mockResolvedValueOnce({ sendRealtimeInput: send, close: vi.fn() });
    h.online(); await settle();
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2600);
    expect(send.mock.calls.filter(([input]) => input.audio)).toHaveLength(100);
    expect(h.api.reconnectSession).toHaveBeenCalledTimes(1);
  });

  it('recovers missing turnComplete even when no learner watchdog timer was active', async () => {
    const h = harness(); await h.room.start(options);
    h.calls[0]!.callbacks.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] } } });
    h.drain(); await vi.advanceTimersByTimeAsync(26_001);
    expect(h.api.reconnectSession).toHaveBeenCalledWith('room-1', expect.objectContaining({ forceNew: true }));
  });

  it('does not let an old room save failure close a newly started room', async () => {
    const h = harness(); await h.room.start(options);
    const pending = deferred<object>();
    h.api.saveHistory.mockReturnValueOnce(pending.promise);
    h.calls[0]!.callbacks.onmessage({ serverContent: { inputTranscription: { text: 'old room' }, turnComplete: true } });
    await vi.advanceTimersByTimeAsync(1);
    await h.room.stop(); await h.room.start(options);
    pending.reject({ status: 403, message: 'stale failure' }); await settle();
    expect(h.room.getSnapshot().status).not.toBe('error');
    expect(h.room.getSnapshot().error).toBeNull();
  });

  it('persists the last valid snapshot if a transcript exceeds the explicit recovery limit', async () => {
    const h = harness(); await h.room.start(options);
    const message = h.calls[0]!.callbacks.onmessage;
    message({ serverContent: { inputTranscription: { text: 'keep this' }, turnComplete: true } });
    message({ serverContent: { outputTranscription: { text: 'x'.repeat(8001) } } });
    await settle();
    expect(h.room.getSnapshot().status).toBe('error');
    expect(h.room.getSnapshot().transcript.map((turn) => turn.text)).toEqual(['keep this']);
    expect(h.api.saveHistory).toHaveBeenLastCalledWith('room-1', expect.objectContaining({ turns: [expect.objectContaining({ text: 'keep this' })] }));
  });

  it('waits for final history before starting the same controller again while closing locally at once', async () => {
    const h = harness(); await h.room.start(options);
    h.calls[0]!.callbacks.onmessage({ serverContent: { inputTranscription: { text: 'my final turn' } } });
    const pending = deferred<object>();
    h.api.saveHistory.mockReturnValueOnce(pending.promise);
    const stopping = h.room.stop();
    expect(h.room.getSnapshot().status).toBe('idle');
    expect(h.audio.stop).toHaveBeenCalledTimes(1);
    const starting = h.room.start(options); await settle();
    // Audio still starts synchronously from the user's click; only session hydration waits.
    expect(h.audio.start).toHaveBeenCalledTimes(2);
    expect(h.api.createSession).toHaveBeenCalledTimes(1);
    pending.resolve({}); await stopping; await starting;
    expect(h.api.createSession).toHaveBeenCalledTimes(2);
  });

  it('waits for final history across modal remounts without retaining or sharing transcript data', async () => {
    const old = harness(); await old.room.start(options);
    const pending = deferred<object>();
    old.api.saveHistory.mockReturnValueOnce(pending.promise);
    const stopping = old.room.stop();
    const next = harness();
    const starting = next.room.start(options); await settle();
    expect(next.audio.start).toHaveBeenCalledTimes(1);
    expect(next.api.createSession).not.toHaveBeenCalled();
    pending.resolve({}); await stopping; await starting;
    expect(next.api.createSession).toHaveBeenCalledTimes(1);
    expect(next.room.getSnapshot().transcript).toEqual([]);
  });

  it('does not create a room if the learner cancels while waiting for prior finalization', async () => {
    const old = harness(); await old.room.start(options);
    const pending = deferred<object>();
    old.api.saveHistory.mockReturnValueOnce(pending.promise);
    const stopping = old.room.stop();
    const next = harness();
    const starting = next.room.start(options); await settle(); await next.room.stop();
    pending.resolve({}); await stopping; await starting;
    expect(next.api.createSession).not.toHaveBeenCalled();
    expect(next.room.getSnapshot().status).toBe('idle');
  });
});
