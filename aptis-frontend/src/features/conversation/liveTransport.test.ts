import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiConversationSession } from '@/api/endpoints';
import { connectGemini } from './liveTransport';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  send = vi.fn<(data: string) => void>();
  // Closing is asynchronous in real browsers. Deliberately do not fire onclose here.
  close = vi.fn((_code?: number) => { this.readyState = 2; });
  constructor(readonly url: URL) { FakeSocket.instances.push(this); }
  open() { this.readyState = FakeSocket.OPEN; this.onopen?.(); }
  frame(data: unknown) { this.onmessage?.({ data }); }
  error() { this.onerror?.(); }
  closed(code = 1006, reason = '') { this.readyState = 3; this.onclose?.({ code, reason }); }
}

const backend: AiConversationSession = {
  sessionId: 'test-room', ephemeralToken: 'test-token+reserved/value',
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  startedAt: '2026-09-23T01:00:00Z', expiresAt: '2026-09-23T02:00:00Z',
  tokenStartExpiresAt: '2026-09-23T01:01:00Z', handoffSecondsBeforeExpiry: 60,
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { resolve, promise };
}

async function settle() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

function callbacks() {
  return { onmessage: vi.fn(), onerror: vi.fn(), onclose: vi.fn() };
}

describe('connectGemini', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends constrained setup and only resolves after the setup acknowledgement', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, 'resume-handle', 'Puck', events);
    const socket = FakeSocket.instances[0]!;
    let ready = false;
    void connecting.then(() => { ready = true; });
    expect(socket.url.searchParams.get('access_token')).toBe(backend.ephemeralToken);
    expect(socket.url.pathname).toContain('BidiGenerateContentConstrained');
    socket.open();
    await settle();
    expect(ready).toBe(false);
    const setup = JSON.parse(socket.send.mock.calls[0]![0]) as { setup: Record<string, unknown> };
    expect(setup.setup).toMatchObject({
      model: `models/${backend.model}`,
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      } },
      sessionResumption: { handle: 'resume-handle' },
      realtimeInputConfig: { activityHandling: 'NO_INTERRUPTION' },
    });
    socket.frame(new TextEncoder().encode('{"setupComplete":{}}').buffer);
    const link = await connecting;
    expect(events.onmessage).toHaveBeenCalledWith({ setupComplete: {} });
    const audio = { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' };
    link.sendRealtimeInput({ audio });
    expect(JSON.parse(socket.send.mock.calls[1]![0])).toEqual({ realtimeInput: { audio } });
    link.close();
  });

  it('does not duplicate an existing models prefix', async () => {
    const connecting = connectGemini({ ...backend, model: `models/${backend.model}` }, undefined, 'Aoede', callbacks());
    const socket = FakeSocket.instances[0]!;
    socket.open();
    expect(JSON.parse(socket.send.mock.calls[0]![0]).setup.model).toBe(`models/${backend.model}`);
    socket.frame('{"setupComplete":{}}');
    (await connecting).close();
  });

  it('cancels before setup and ignores a late setup or content frame', async () => {
    const controller = new AbortController();
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events, controller.signal);
    const rejected = expect(connecting).rejects.toThrow();
    const socket = FakeSocket.instances[0]!;
    socket.open();
    controller.abort();
    await rejected;
    expect(socket.close).toHaveBeenCalled();
    socket.frame('{"setupComplete":{}}');
    socket.frame('{"serverContent":{"outputTranscription":{"text":"stale"}}}');
    await settle();
    expect(events.onmessage).not.toHaveBeenCalled();
  });

  it('an already-aborted request never sends setup when the socket opens late', async () => {
    const controller = new AbortController();
    controller.abort();
    const connecting = connectGemini(backend, undefined, 'Aoede', callbacks(), controller.signal);
    await expect(connecting).rejects.toThrow();
    // A transport may choose not to create a socket at all for this request.
    const socket = FakeSocket.instances[0];
    socket?.open();
    expect(socket?.send.mock.calls.length ?? 0).toBe(0);
  });

  it('rejects an opening socket error and ignores frames arriving afterwards', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const rejected = expect(connecting).rejects.toThrow('socket_error');
    const socket = FakeSocket.instances[0]!;
    socket.error();
    await rejected;
    expect(events.onerror).toHaveBeenCalledTimes(1);
    socket.frame('{"setupComplete":{}}');
    await settle();
    expect(events.onmessage).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
  });

  it('rejects a server close before setup and reports its reason/code', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const rejected = expect(connecting).rejects.toThrow('1008');
    const socket = FakeSocket.instances[0]!;
    socket.closed(1008, 'Token rejected');
    await rejected;
    expect(events.onclose).toHaveBeenCalledWith({ code: 1008, reason: 'Token rejected' });
    socket.frame('{"setupComplete":{}}');
    await settle();
    expect(events.onmessage).not.toHaveBeenCalled();
  });

  it('preserves the provider error code so the room can back off on 429', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const rejected = expect(connecting).rejects.toThrow('429');
    const socket = FakeSocket.instances[0]!;
    socket.open();
    socket.frame('{"error":{"code":429,"message":"Quota exhausted"}}');
    await rejected;
    expect(events.onerror).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('429') }));
    expect(socket.close).toHaveBeenCalled();
  });

  it('processes Blob frames in arrival order even when decoding the first one is slow', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const socket = FakeSocket.instances[0]!;
    socket.open();
    socket.frame('{"setupComplete":{}}');
    const link = await connecting;
    events.onmessage.mockClear();
    const firstText = deferred<string>();
    const firstBlob = new Blob();
    vi.spyOn(firstBlob, 'text').mockReturnValue(firstText.promise);
    socket.frame(firstBlob);
    socket.frame(new Blob(['{"serverContent":{"outputTranscription":{"text":"second"}}}']));
    await settle();
    expect(events.onmessage).not.toHaveBeenCalled();
    firstText.resolve('{"serverContent":{"outputTranscription":{"text":"first"}}}');
    await settle();
    expect(events.onmessage.mock.calls.map(([message]) => message.serverContent.outputTranscription.text))
      .toEqual(['first', 'second']);
    link.close();
  });

  it('local close discards in-flight Blob decoding without waiting for the close event', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const socket = FakeSocket.instances[0]!;
    socket.open();
    socket.frame('{"setupComplete":{}}');
    const link = await connecting;
    events.onmessage.mockClear();
    const text = deferred<string>();
    const blob = new Blob();
    vi.spyOn(blob, 'text').mockReturnValue(text.promise);
    socket.frame(blob);
    await settle();
    link.close();
    text.resolve('{"serverContent":{"outputTranscription":{"text":"stale"}}}');
    socket.frame('{"serverContent":{"turnComplete":true}}');
    await settle();
    expect(events.onmessage).not.toHaveBeenCalled();
  });

  it('rejects malformed frames and closes without delivering their queued successors', async () => {
    const events = callbacks();
    const connecting = connectGemini(backend, undefined, 'Aoede', events);
    const rejected = expect(connecting).rejects.toThrow();
    const socket = FakeSocket.instances[0]!;
    socket.open();
    socket.frame('not JSON');
    socket.frame('{"setupComplete":{}}');
    await rejected;
    await settle();
    expect(events.onerror).toHaveBeenCalledTimes(1);
    expect(events.onmessage).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
  });

  it('refuses additional audio while the socket buffer is congested or closing', async () => {
    const connecting = connectGemini(backend, undefined, 'Aoede', callbacks());
    const socket = FakeSocket.instances[0]!;
    socket.open();
    socket.frame('{"setupComplete":{}}');
    const link = await connecting;
    socket.bufferedAmount = 256_001;
    expect(() => link.sendRealtimeInput({ audio: { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' } }))
      .toThrow('backpressure');
    expect(socket.send).toHaveBeenCalledTimes(1);
    socket.bufferedAmount = 0;
    link.close();
    expect(() => link.sendRealtimeInput({ audioStreamEnd: true })).toThrow('socket_not_ready');
    expect(socket.send).toHaveBeenCalledTimes(1);
  });
});
