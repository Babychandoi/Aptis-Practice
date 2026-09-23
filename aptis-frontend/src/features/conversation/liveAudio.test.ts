import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserVoiceAudio } from './liveAudio';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

class FakeTrack extends EventTarget {
  stop = vi.fn();
}

function fakeStream() {
  const track = new FakeTrack();
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

class FakeBuffer {
  readonly duration: number;
  readonly samples: Float32Array;
  constructor(length: number, readonly sampleRate: number) {
    this.duration = length / sampleRate;
    this.samples = new Float32Array(length);
  }
  copyToChannel(samples: Float32Array) { this.samples.set(samples); }
}

class FakeSource {
  buffer: FakeBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  stop = vi.fn();
  start = vi.fn<(when: number) => void>();
  end() { this.onended?.(); }
}

class FakeProcessor {
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  capture(samples: Float32Array) {
    const output = new Float32Array(samples.length).fill(0.75);
    this.onaudioprocess?.({
      inputBuffer: { getChannelData: () => samples },
      outputBuffer: { getChannelData: () => output },
    } as unknown as AudioProcessingEvent);
    return output;
  }
}

class FakeContext {
  static instances: FakeContext[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 1;
  sampleRate = 48_000;
  destination = {};
  sources: FakeSource[] = [];
  processor = new FakeProcessor();
  input = { connect: vi.fn(), disconnect: vi.fn() };
  resumeWork = () => { this.state = 'running'; return Promise.resolve(); };
  resume = vi.fn(() => this.resumeWork());
  close = vi.fn(() => { this.state = 'closed'; return Promise.resolve(); });
  createMediaStreamSource = vi.fn(() => this.input);
  createScriptProcessor = vi.fn(() => this.processor);
  createBuffer = vi.fn((_channels: number, length: number, rate: number) => new FakeBuffer(length, rate));
  createBufferSource = vi.fn(() => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  });
  constructor() { FakeContext.instances.push(this); }
}

function pcm(value: number, samples = 1): string {
  const bytes = new Uint8Array(2 * samples);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples; index += 1) view.setInt16(index * 2, value, true);
  return btoa(String.fromCharCode(...bytes));
}

async function settle() {
  // Drain the resume, pump and cancellation continuations without wall-clock waits.
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

describe('BrowserVoiceAudio', () => {
  let audio: BrowserVoiceAudio;
  let media: ReturnType<typeof fakeStream>;
  let getUserMedia: ReturnType<typeof vi.fn<() => Promise<MediaStream>>>;

  beforeEach(() => {
    FakeContext.instances = [];
    media = fakeStream();
    getUserMedia = vi.fn(async () => media.stream);
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    audio = new BrowserVoiceAudio();
  });

  afterEach(() => {
    audio.stop();
    vi.unstubAllGlobals();
  });

  it('unlocks audio and requests the microphone during start, before awaiting permission', async () => {
    const permission = deferred<MediaStream>();
    getUserMedia.mockReturnValue(permission.promise);
    const onPcm = vi.fn();
    const started = audio.start(onPcm, vi.fn(), vi.fn());
    const context = FakeContext.instances[0]!;
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    permission.resolve(media.stream);
    await started;

    expect(context.createScriptProcessor).toHaveBeenCalledWith(2048, 1, 1);
    expect(context.processor.capture(new Float32Array(48).fill(0.5)).every((v) => v === 0)).toBe(true);
    expect(onPcm).not.toHaveBeenCalled();
    audio.setMuted(false);
    context.processor.capture(new Float32Array(48).fill(0.5));
    const bytes = Uint8Array.from(atob(onPcm.mock.calls[0]![0] as string), (char) => char.charCodeAt(0));
    expect(bytes.length).toBe(16 * 2);
    expect(new DataView(bytes.buffer).getInt16(0, true)).toBe(16_384);
    audio.setMuted(true);
    context.processor.capture(new Float32Array(48).fill(0.5));
    expect(onPcm).toHaveBeenCalledTimes(1);
    expect(media.track.stop).not.toHaveBeenCalled();
    await audio.resume();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('queues chunks in order across a suspended context and shares concurrent resume', async () => {
    const onDrained = vi.fn();
    await audio.start(vi.fn(), vi.fn(), onDrained);
    const context = FakeContext.instances[0]!;
    const wake = deferred<void>();
    context.state = 'suspended';
    context.resumeWork = () => wake.promise;
    audio.play(pcm(100));
    audio.play(pcm(200));
    const resumed = audio.resume();
    expect(audio.playing).toBe(true);
    expect(context.sources).toHaveLength(0);
    expect(context.resume).toHaveBeenCalledTimes(2); // Initial unlock + shared wake-up.
    context.state = 'running';
    wake.resolve();
    await resumed;
    await settle();

    expect(context.sources.map((source) => source.buffer!.samples[0])).toEqual([100 / 32768, 200 / 32768]);
    expect(context.sources[1]!.start.mock.calls[0]![0])
      .toBeCloseTo((context.sources[0]!.start.mock.calls[0]![0] as number) + 1 / 24_000, 8);
    context.sources[0]!.end();
    expect(onDrained).not.toHaveBeenCalled();
    expect(audio.playing).toBe(true);
    context.sources[1]!.end();
    expect(onDrained).toHaveBeenCalledTimes(1);
    expect(audio.playing).toBe(false);
    expect(context.sources.every((source) => source.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it('keeps one second of 44.1 kHz capture at exactly 16,000 samples across block boundaries', async () => {
    const onPcm = vi.fn();
    await audio.start(onPcm, vi.fn(), vi.fn());
    const context = FakeContext.instances[0]!;
    context.sampleRate = 44_100;
    audio.setMuted(false);
    for (let offset = 0; offset < 44_100; offset += 2048) {
      context.processor.capture(new Float32Array(Math.min(2048, 44_100 - offset)).fill(0.25));
    }
    const byteCount = onPcm.mock.calls.reduce((total, [data]) => total + atob(data as string).length, 0);
    expect(byteCount).toBe(16_000 * 2);
  });

  it('does not report drained while another chunk is waiting for resume', async () => {
    const onDrained = vi.fn();
    await audio.start(vi.fn(), vi.fn(), onDrained);
    const context = FakeContext.instances[0]!;
    audio.play(pcm(100));
    await settle();
    const wake = deferred<void>();
    context.state = 'suspended';
    context.resumeWork = () => wake.promise;
    audio.play(pcm(200));
    context.sources[0]!.end();
    expect(audio.playing).toBe(true);
    expect(onDrained).not.toHaveBeenCalled();
    context.state = 'running';
    wake.resolve();
    await settle();
    context.sources[1]!.end();
    expect(onDrained).toHaveBeenCalledTimes(1);
  });

  it('appends a chunk arriving just before the prior one ends without adding another startup gap', async () => {
    await audio.start(vi.fn(), vi.fn(), vi.fn());
    const context = FakeContext.instances[0]!;
    audio.play(pcm(100, 240));
    await settle();
    const first = context.sources[0]!;
    const endAt = first.start.mock.calls[0]![0] + first.buffer!.duration;
    context.currentTime = endAt - 0.005;
    audio.play(pcm(200, 240));
    await settle();
    expect(context.sources[1]!.start).toHaveBeenCalledWith(endAt);
  });

  it('clearing playback invalidates old pending chunks without discarding a new turn', async () => {
    const onDrained = vi.fn();
    await audio.start(vi.fn(), vi.fn(), onDrained);
    const context = FakeContext.instances[0]!;
    const wake = deferred<void>();
    context.state = 'suspended';
    context.resumeWork = () => wake.promise;
    audio.play(pcm(111));
    audio.clearPlayback();
    expect(audio.playing).toBe(false);
    expect(onDrained).toHaveBeenCalledTimes(1);
    audio.play(pcm(222));
    context.state = 'running';
    wake.resolve();
    await settle();

    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]!.buffer!.samples[0]).toBe(222 / 32768);
    context.sources[0]!.end();
    expect(onDrained).toHaveBeenCalledTimes(2);
  });

  it('stop cancels a permission wait and disposes any microphone stream granted later', async () => {
    const permission = deferred<MediaStream>();
    getUserMedia.mockReturnValue(permission.promise);
    const onFailure = vi.fn();
    const started = audio.start(vi.fn(), onFailure, vi.fn());
    const rejected = expect(started).rejects.toMatchObject({ name: 'AbortError' });
    audio.stop();
    await rejected;
    expect(FakeContext.instances[0]!.close).toHaveBeenCalledTimes(1);
    permission.resolve(media.stream);
    await settle();
    expect(media.track.stop).toHaveBeenCalledTimes(1);
    expect(FakeContext.instances[0]!.createMediaStreamSource).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('stop prevents a delayed resume from scheduling audio and closes resources once', async () => {
    const onDrained = vi.fn();
    await audio.start(vi.fn(), vi.fn(), onDrained);
    const context = FakeContext.instances[0]!;
    audio.play(pcm(10));
    await settle();
    const playingSource = context.sources[0]!;
    const wake = deferred<void>();
    context.state = 'suspended';
    context.resumeWork = () => wake.promise;
    audio.play(pcm(20));
    audio.stop();
    audio.stop();
    wake.resolve();
    await settle();
    expect(context.sources).toHaveLength(1);
    expect(playingSource.stop).toHaveBeenCalledTimes(1);
    expect(playingSource.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(media.track.stop).toHaveBeenCalledTimes(1);
    expect(onDrained).not.toHaveBeenCalled();
    expect(audio.playing).toBe(false);
  });

  it('a late permission result from an old room cannot take over a newly started room', async () => {
    const permission = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(permission.promise);
    const oldStart = audio.start(vi.fn(), vi.fn(), vi.fn());
    const rejected = expect(oldStart).rejects.toMatchObject({ name: 'AbortError' });
    audio.stop();
    await rejected;
    const nextMedia = fakeStream();
    getUserMedia.mockResolvedValue(nextMedia.stream);
    const onPcm = vi.fn();
    await audio.start(onPcm, vi.fn(), vi.fn());
    permission.resolve(media.stream);
    await settle();
    expect(media.track.stop).toHaveBeenCalledTimes(1);
    expect(nextMedia.track.stop).not.toHaveBeenCalled();
    audio.setMuted(false);
    FakeContext.instances[1]!.processor.capture(new Float32Array(48).fill(0.5));
    expect(onPcm).toHaveBeenCalledTimes(1);
    audio.stop();
    expect(nextMedia.track.stop).toHaveBeenCalledTimes(1);
  });

  it('preserves denied-permission errors and cleans the eagerly created context', async () => {
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    getUserMedia.mockRejectedValue(denied);
    await expect(audio.start(vi.fn(), vi.fn(), vi.fn())).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(FakeContext.instances[0]!.close).toHaveBeenCalledTimes(1);
  });

  it('reports playback and disconnected-microphone failures without unhandled tasks', async () => {
    const onFailure = vi.fn();
    await audio.start(vi.fn(), onFailure, vi.fn());
    audio.play('AA=='); // An incomplete 16-bit sample.
    await settle();
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ name: 'EncodingError' }));
    expect(audio.playing).toBe(false);
    audio.setMuted(false);
    media.track.dispatchEvent(new Event('ended'));
    expect(onFailure).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'NotReadableError' }));
  });
});
