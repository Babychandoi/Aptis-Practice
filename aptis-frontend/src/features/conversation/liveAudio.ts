export interface VoiceAudio {
  start(onPcm: (data: string) => void, onFailure: (error: Error) => void, onDrained: () => void): Promise<void>;
  play(base64: string): void;
  clearPlayback(): void;
  setMuted(muted: boolean): void;
  resume(): Promise<void>;
  stop(): void;
  readonly playing: boolean;
}

/** A room owns the microphone and audio context; reconnecting its socket owns neither. */
export class BrowserVoiceAudio implements VoiceAudio {
  private active = false;
  private roomGeneration = 0;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private trackListeners: Array<{ track: MediaStreamTrack; listener: () => void }> = [];
  private muted = true;
  private failed = false;
  private onPcm: ((data: string) => void) | null = null;
  private onFailure: ((error: Error) => void) | null = null;
  private onDrained: (() => void) | null = null;
  private starting: Promise<void> | null = null;
  private cancelStart: (() => void) | null = null;
  private resuming: { context: AudioContext; promise: Promise<void> } | null = null;
  private queue: string[] = [];
  private pumpToken: symbol | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private playbackAt = 0;
  private needsDrain = false;
  private sampleSum = 0;
  private sampleWeight = 0;

  get playing(): boolean {
    return this.queue.length > 0 || this.sources.size > 0 || this.pumpToken !== null;
  }

  start(onPcm: (data: string) => void, onFailure: (error: Error) => void, onDrained: () => void): Promise<void> {
    if (this.active) return this.starting ?? Promise.resolve();
    const generation = ++this.roomGeneration;
    this.active = true;
    this.muted = true;
    this.failed = false;
    this.onPcm = onPcm;
    this.onFailure = onFailure;
    this.onDrained = onDrained;
    const cancellation = new Promise<never>((_resolve, reject) => {
      this.cancelStart = () => reject(audioError('AbortError', 'Đã đóng phòng hội thoại.'));
    });
    // initialize invokes resume and getUserMedia synchronously, while the click still
    // provides user activation. Neither operation waits for a backend/socket request.
    const initializing = this.initialize(generation);
    const starting = Promise.race([initializing, cancellation]).catch((cause: unknown) => {
      if (this.roomGeneration === generation) this.stop();
      throw asError(cause);
    }).finally(() => {
      if (this.starting === starting) {
        this.starting = null;
        this.cancelStart = null;
      }
    });
    this.starting = starting;
    return starting;
  }

  private async initialize(generation: number): Promise<void> {
    const AudioContextClass = globalThis.AudioContext
      ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
      throw audioError('NotSupportedError', 'Trình duyệt này chưa hỗ trợ micro. Hãy mở bằng Chrome hoặc Safari qua HTTPS.');
    }
    const context = new AudioContextClass();
    this.context = context;
    const resumed = this.resumeContext(context);
    const permission = navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then((stream) => {
      if (!this.isCurrent(generation)) {
        stream.getTracks().forEach((track) => track.stop());
        throw audioError('AbortError', 'Đã đóng phòng hội thoại.');
      }
      // Own the stream as soon as it arrives, even if resume is still pending.
      this.stream = stream;
      return stream;
    });
    const [stream] = await Promise.all([permission, resumed]);
    if (!this.isCurrent(generation)) throw audioError('AbortError', 'Đã đóng phòng hội thoại.');

    const source = context.createMediaStreamSource(stream);
    this.inputSource = source;
    const processor = context.createScriptProcessor(2048, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = (event) => {
      // ScriptProcessor needs an output connection, but the microphone must never
      // be routed to the speaker. The playback nodes have their own connection.
      event.outputBuffer.getChannelData(0).fill(0);
      if (!this.isCurrent(generation) || this.muted) return;
      try {
        const bytes = this.encodePcm(event.inputBuffer.getChannelData(0), context.sampleRate);
        if (bytes.length) this.onPcm?.(toBase64(bytes));
      } catch (cause) {
        this.reportFailure(cause, generation);
      }
    };
    source.connect(processor);
    processor.connect(context.destination);
    for (const track of stream.getAudioTracks()) {
      const listener = () => this.reportFailure(
        audioError('NotReadableError', 'Micro đã bị ngắt. Hãy kiểm tra micro rồi mở lại phòng hội thoại.'), generation);
      track.addEventListener('ended', listener);
      this.trackListeners.push({ track, listener });
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.sampleSum = 0;
    this.sampleWeight = 0;
    if (!muted) this.failed = false;
  }

  play(base64: string): void {
    if (!this.active || !this.context || !base64) return;
    this.queue.push(base64);
    this.needsDrain = true;
    if (this.pumpToken !== null) return;
    const token = Symbol('playback');
    this.pumpToken = token;
    void this.pump(this.context, this.roomGeneration, token);
  }

  private async pump(context: AudioContext, generation: number, token: symbol): Promise<void> {
    try {
      // One consumer schedules the entire FIFO. Awaiting resume per chunk in
      // independent tasks can reorder chunks or replay old chunks after a stop.
      await this.resumeContext(context);
      if (!this.isCurrent(generation) || this.pumpToken !== token) return;
      while (this.queue.length > 0) {
        const encoded = this.queue.shift()!;
        const binary = atob(encoded);
        if (binary.length === 0 || binary.length % 2 !== 0) {
          throw audioError('EncodingError', 'Đoạn âm thanh AI không hợp lệ.');
        }
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        const samples = new Float32Array(bytes.length / 2);
        for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
        const buffer = context.createBuffer(1, samples.length, 24_000);
        buffer.copyToChannel(samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        this.sources.add(source);
        source.onended = () => {
          source.onended = null;
          source.disconnect();
          this.sources.delete(source);
          this.notifyDrained();
        };
        // A short lead cushions the first chunk. Once queued, append exactly to
        // its predecessor; applying that lead again near the boundary adds gaps.
        const startAt = this.playbackAt > context.currentTime
          ? this.playbackAt : context.currentTime + 0.03;
        source.start(startAt);
        this.playbackAt = startAt + buffer.duration;
      }
    } catch (cause) {
      if (this.isCurrent(generation) && this.pumpToken === token) {
        this.reportFailure(cause, generation);
        if (this.isCurrent(generation)) this.clearPlayback();
      }
    } finally {
      if (this.pumpToken === token) {
        this.pumpToken = null;
        this.notifyDrained();
      }
    }
  }

  clearPlayback(): void {
    // Invalidating the pump also discards an in-flight resume continuation.
    this.pumpToken = null;
    this.queue = [];
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* It may already have ended. */ }
      source.disconnect();
    }
    this.sources.clear();
    this.playbackAt = 0;
    this.notifyDrained();
  }

  private notifyDrained(): void {
    if (!this.active || !this.needsDrain || this.playing) return;
    this.needsDrain = false;
    try { this.onDrained?.(); } catch (cause) { this.reportFailure(cause, this.roomGeneration); }
  }

  async resume(): Promise<void> {
    const context = this.context;
    if (!this.active || !context) return;
    await this.resumeContext(context);
  }

  private resumeContext(context: AudioContext): Promise<void> {
    if (this.resuming?.context === context) return this.resuming.promise;
    if (context.state === 'running') return Promise.resolve();
    if (context.state === 'closed') {
      return Promise.reject(audioError('InvalidStateError', 'Thiết bị âm thanh đã đóng. Hãy mở lại phòng hội thoại.'));
    }
    try {
      // Call resume now, not in a .then(), to preserve a mobile user gesture.
      const operation = context.resume();
      const promise = operation.finally(() => {
        if (this.resuming?.promise === promise) this.resuming = null;
      });
      this.resuming = { context, promise };
      return promise;
    } catch (cause) {
      return Promise.reject(asError(cause));
    }
  }

  stop(): void {
    this.active = false;
    this.roomGeneration += 1;
    this.muted = true;
    this.cancelStart?.();
    this.cancelStart = null;
    this.starting = null;
    this.clearPlayback();
    this.needsDrain = false;
    this.trackListeners.forEach(({ track, listener }) => track.removeEventListener('ended', listener));
    this.trackListeners = [];
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
    }
    this.processor = null;
    this.inputSource?.disconnect();
    this.inputSource = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    const context = this.context;
    this.context = null;
    this.resuming = null;
    if (context && context.state !== 'closed') void context.close().catch(() => { /* Best-effort disposal. */ });
    this.sampleSum = 0;
    this.sampleWeight = 0;
    this.onPcm = null;
    this.onFailure = null;
    this.onDrained = null;
  }

  private isCurrent(generation: number): boolean {
    return this.active && this.roomGeneration === generation;
  }

  private reportFailure(cause: unknown, generation: number): void {
    if (!this.isCurrent(generation) || this.failed) return;
    this.failed = true;
    this.muted = true;
    // A consumer's error handler must not reject an unobserved audio task.
    try { this.onFailure?.(asError(cause)); } catch { /* The controller owns its own errors. */ }
  }

  private encodePcm(input: Float32Array, inputRate: number): Uint8Array {
    const ratio = inputRate / 16_000;
    const bytes = new Uint8Array(Math.ceil((input.length + this.sampleWeight) / ratio) * 2);
    const view = new DataView(bytes.buffer);
    let count = 0;
    // Keep fractional input samples between callbacks (e.g. 44.1 kHz -> 16 kHz),
    // instead of dropping part of every block and gradually drifting in time.
    for (const sample of input) {
      let remaining = 1;
      while (remaining > 1e-8) {
        const weight = Math.min(remaining, ratio - this.sampleWeight);
        this.sampleSum += sample * weight;
        this.sampleWeight += weight;
        remaining -= weight;
        if (this.sampleWeight >= ratio - 1e-8) {
          const value = Math.max(-1, Math.min(1, this.sampleSum / ratio));
          view.setInt16(count * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
          count += 1;
          this.sampleSum = 0;
          this.sampleWeight = 0;
        }
      }
    }
    return bytes.subarray(0, count * 2);
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function audioError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
