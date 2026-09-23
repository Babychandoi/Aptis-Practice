import type { LiveServerMessage } from '@google/genai';
import { aiConversationApi, type AiConversationHistoryTurn, type AiConversationSession } from '@/api/endpoints';
import { BrowserVoiceAudio, type VoiceAudio } from './liveAudio';
import { connectGemini } from './liveTransport';

export type ConversationStatus = 'idle' | 'connecting' | 'reconnecting' | 'listening' | 'speaking' | 'handoff' | 'error';
export type TranscriptLine = AiConversationHistoryTurn;
export interface RoomView {
  status: ConversationStatus;
  transcript: TranscriptLine[];
  secondsLeft: number;
  error: string | null;
  notice: string | null;
}
export interface RoomOptions { topic: string; level: string; voice: string; freshStart?: boolean; }
export interface LiveLink {
  sendRealtimeInput(input: { audio?: { data: string; mimeType: string }; text?: string; audioStreamEnd?: boolean }): void;
  close(): void;
}
// The wire carries JSON fields, not the SDK class's computed text/data getters.
export type LiveMessage = Pick<LiveServerMessage,
  'serverContent' | 'sessionResumptionUpdate' | 'goAway' | 'usageMetadata' | 'setupComplete'>;
export interface LiveCallbacks {
  onmessage(message: LiveMessage): void;
  onerror(event: { message?: string }): void;
  onclose(event: { code?: number; reason?: string }): void;
}
export type ConnectLive = (session: AiConversationSession, handle: string | undefined,
  voice: string, callbacks: LiveCallbacks, signal?: AbortSignal) => Promise<LiveLink>;
type RoomApi = Pick<typeof aiConversationApi, 'createSession' | 'reconnectSession' | 'saveHistory' | 'saveSummary' | 'closeSession'>;
export interface RoomDependencies { api?: RoomApi; audio?: VoiceAudio; connect?: ConnectLive; online?: () => boolean; }

const SETUP_TIMEOUT = 12_000;
const BUFFER_BYTES = 16_000 * 2 * 12; // At most 12 seconds of unsent PCM, in memory only.
const HISTORY_CHARS = 200_000;
const HISTORY_TURNS = 10_000;
// A modal remount creates another controller. Wait for the previous controller's
// final archive writes before a new room hydrates them; retain no user content here.
const pendingRoomFinalizations = new Set<Promise<void>>();
interface Attempt {
  epoch: number; accepted: boolean; cancelled: boolean; link?: LiveLink;
  reject(error: Error): void;
  controller: AbortController;
}
class LiveFailure extends Error {
  constructor(message: string, readonly closeCode?: number) { super(message); }
}

/** A room survives many Gemini sockets. Async work belongs to a room epoch + socket attempt. */
export class LiveConversationRoom {
  private view: RoomView = { status: 'idle', transcript: [], secondsLeft: 0, error: null, notice: null };
  private listeners = new Set<() => void>();
  private readonly api: RoomApi;
  private readonly audio: VoiceAudio;
  private readonly connectLive: ConnectLive;
  private readonly online: () => boolean;
  private options: RoomOptions = { topic: 'Daily life', level: 'B1', voice: 'Aoede' };
  private running = false;
  private epoch = 0;
  private attempt?: Attempt;
  private backend?: AiConversationSession;
  private link?: LiveLink;
  private recovering?: Promise<void>;
  private handle?: string;
  private resumable = false;
  private connectedOnce = false;
  private responding = false;
  private turnComplete = true;
  private micMuted = true;
  private echoTimer?: ReturnType<typeof setTimeout>;
  private tickTimer?: ReturnType<typeof setInterval>;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private wakeRetry?: () => void;
  private goAwayAt = 0;
  private lastSpeechAt = 0;
  private waitingSince = 0;
  private lastContentAt = 0;
  private activeUser?: string;
  private activeAi?: string;
  private revision = 0;
  private savedRevisions = new Map<string, number>();
  private saving?: Promise<void>;
  private buffered: { data: string; bytes: number; speech: boolean }[] = [];
  private bufferedBytes = 0;
  private flushing?: symbol;
  private lostBufferedSpeech = false;
  private inputTokens = 0;
  private outputTokens = 0;
  private reconnectCount = 0;
  private disconnectCount = 0;
  private rateLimitCount = 0;
  private connectLatencyMs = 0;
  private consecutiveFailures = 0;
  private lastConnectedAt = 0;
  private needsContinuation = false;
  private retryNotBefore = 0;

  constructor(dependencies: RoomDependencies = {}) {
    this.api = dependencies.api ?? aiConversationApi;
    this.audio = dependencies.audio ?? new BrowserVoiceAudio();
    this.connectLive = dependencies.connect ?? connectGemini;
    this.online = dependencies.online ?? (() => navigator.onLine !== false);
  }
  getSnapshot = (): RoomView => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private emit(update: Partial<RoomView>) {
    this.view = { ...this.view, ...update };
    this.listeners.forEach((listener) => listener());
  }

  async start(options: RoomOptions): Promise<void> {
    if (this.running) return;
    const epoch = ++this.epoch;
    this.options = options;
    this.running = true;
    this.connectedOnce = false;
    this.handle = undefined;
    this.resumable = false;
    this.backend = undefined;
    this.revision = 0;
    this.saving = undefined;
    this.savedRevisions.clear();
    this.inputTokens = this.outputTokens = this.reconnectCount = this.disconnectCount = this.rateLimitCount = 0;
    this.consecutiveFailures = 0;
    this.lostBufferedSpeech = false;
    this.needsContinuation = false;
    this.retryNotBefore = 0;
    this.activeUser = this.activeAi = undefined;
    this.emit({ status: 'connecting', transcript: [], error: null, notice: null, secondsLeft: 0 });
    try {
      // Ask permission before issuing a billable session. Keep the device across reconnections.
      await this.audio.start((pcm) => this.onPcm(pcm), (error) => this.audioFailed(error), () => this.releaseMic());
      // Keep microphone acquisition inside the click's user activation, then wait
      // for nonblocking closes before the backend reads the previous room history.
      while (pendingRoomFinalizations.size && this.current(epoch)) {
        await Promise.allSettled([...pendingRoomFinalizations]);
      }
      if (!this.current(epoch)) return;
      this.tickTimer = setInterval(() => this.tick(), 1_000);
      await this.recover('initial');
    } catch (error) {
      if (this.current(epoch)) this.fail(microphoneMessage(error));
    }
  }

  private current(epoch: number) { return this.running && this.epoch === epoch; }

  /** Local teardown is immediate; persistence and close are independent best-effort requests. */
  async stop(): Promise<void> {
    const backend = this.backend;
    const history = this.view.transcript;
    const revision = this.revision;
    this.running = false;
    ++this.epoch;
    this.cancelAttempt();
    this.backend = undefined;
    this.recovering = undefined;
    this.wakeRetry?.();
    this.wakeRetry = undefined;
    clearInterval(this.tickTimer);
    clearTimeout(this.echoTimer);
    clearTimeout(this.saveTimer);
    this.tickTimer = this.echoTimer = this.saveTimer = undefined;
    this.audio.stop();
    this.micMuted = true;
    this.responding = false;
    this.turnComplete = true;
    this.waitingSince = this.lastSpeechAt = this.goAwayAt = 0;
    this.buffered = [];
    this.bufferedBytes = 0;
    this.flushing = undefined;
    this.emit({ status: 'idle', secondsLeft: 0, notice: null });
    if (!backend) return;
    // A failed history write must never prevent /close (the former stale-session bug).
    const metrics = this.metrics();
    const finalization = Promise.allSettled([
      this.api.saveHistory(backend.sessionId, { turns: history, revision }),
      this.api.saveSummary(backend.sessionId, metrics),
      this.api.closeSession(backend.sessionId),
    ]).then(() => undefined);
    pendingRoomFinalizations.add(finalization);
    try { await finalization; }
    finally { pendingRoomFinalizations.delete(finalization); }
  }

  private fail(message: string) {
    void this.stop();
    this.emit({ status: 'error', error: message, notice: null });
  }

  private cancelAttempt() {
    const previous = this.attempt;
    this.attempt = undefined;
    this.link = undefined;
    if (previous) {
      previous.cancelled = true;
      previous.controller.abort();
      previous.reject(new LiveFailure('cancelled'));
      try { previous.link?.close(); } catch { /* socket is already closed */ }
    }
  }

  private recover(reason: 'initial' | 'disconnect' | 'goAway' | 'lease', forceFresh = false): Promise<void> {
    if (this.recovering) return this.recovering;
    const epoch = this.epoch;
    const task = this.recoveryLoop(epoch, reason, forceFresh);
    this.recovering = task;
    void task.finally(() => {
      if (this.recovering === task) {
        this.recovering = undefined;
        // A new socket may die between handshake success and this finalizer.
        if (this.current(epoch) && !this.link) void this.recover('disconnect');
      }
    });
    return task;
  }

  private async recoveryLoop(epoch: number, reason: string, forceFresh: boolean) {
    this.needsContinuation ||= this.responding || !!this.waitingSince;
    this.cancelAttempt();
    this.turnComplete = true;
    this.responding = false;
    this.releaseMic(); // Buffered speaker audio may finish while a replacement socket opens.
    this.emit({ status: this.connectedOnce ? 'reconnecting' : 'connecting', error: null,
      notice: this.connectedOnce ? 'Đang nối lại, nội dung cuộc trò chuyện vẫn được giữ.' : null });
    let fresh = forceFresh || !this.resumable;
    let first = true;
    while (this.current(epoch)) {
      // Online/visibility events may wake a wait, but must never bypass a quota cooldown.
      if (Date.now() < this.retryNotBefore) {
        await this.wait(this.retryNotBefore - Date.now());
        continue;
      }
      if (!this.online()) {
        this.emit({ notice: 'Mất mạng. Phòng vẫn mở và sẽ tự nối lại khi có mạng.' });
        await this.wait(4_000);
        continue;
      }
      const previous = this.backend;
      const expired = previous && Date.now() >= Date.parse(previous.expiresAt) - 1_000;
      if (expired && previous.handoffSecondsBeforeExpiry <= 0) {
        this.fail('Bạn đã dùng hết thời lượng AI Voice hôm nay. Hạn mức đặt lại lúc 00:00.');
        return;
      }
      const handle = !fresh && !expired ? this.handle : undefined;
      const started = performance.now();
      try {
        const history = this.view.transcript.map((turn) => ({ ...turn }));
        const revision = this.revision;
        const backend = !previous || expired || reason === 'lease'
          ? await this.api.createSession({ ...this.options, previousSessionId: previous?.sessionId,
            history, historyRevision: revision })
          : await this.api.reconnectSession(previous.sessionId, { resumptionHandle: handle,
            forceNew: !handle, history, historyRevision: revision });
        reason = 'disconnect';
        if (!this.current(epoch)) {
          // The token request completed after the learner closed the room.
          if (!previous || previous.sessionId !== backend.sessionId) void this.api.closeSession(backend.sessionId).catch(() => {});
          return;
        }
        this.backend = backend;
        if (!this.connectedOnce && !this.view.transcript.length && backend.history?.length) {
          this.revision = backend.historyRevision ?? 0;
          this.emit({ transcript: backend.history });
        }
        this.savedRevisions.set(backend.sessionId, Math.max(revision, backend.historyRevision ?? 0));
        const actualHandle = backend.resumeAttempted === false ? undefined : handle;
        if (!actualHandle) { this.handle = undefined; this.resumable = false; }
        await this.openSocket(backend, actualHandle, epoch);
        if (!this.current(epoch)) return;
        this.connectLatencyMs = Math.round(performance.now() - started);
        this.lastConnectedAt = Date.now();
        this.connectedOnce = true;
        this.waitingSince = this.lastSpeechAt = 0;
        this.goAwayAt = 0;
        this.emit({ error: null, notice: this.lostBufferedSpeech
          ? 'Mạng vừa ngắt khá lâu; bạn nhắc lại phần nói trong lúc mất mạng giúp mình nhé.' : null });
        this.releaseMic();
        const hasBufferedSpeech = this.buffered.some((frame) => frame.speech);
        await this.flushBuffered(epoch);
        if (!this.current(epoch)) return;
        if (!actualHandle && this.needsContinuation && !hasBufferedSpeech && this.link) {
          this.link.sendRealtimeInput({ text: 'The connection recovered. Continue the unfinished answer to the latest learner message in the supplied conversation history. Do not greet again or repeat completed replies. If part of your last reply is recorded, briefly continue from that point.' });
          this.waitingSince = Date.now();
        }
        this.needsContinuation = false;
        this.scheduleSave();
        if (previous && previous.sessionId !== backend.sessionId) void this.api.closeSession(previous.sessionId).catch(() => {});
        return;
      } catch (error) {
        if (!this.current(epoch)) return;
        this.cancelAttempt();
        if ((error as { details?: { reason?: string } })?.details?.reason === 'AI_SESSION_EXPIRED') {
          reason = 'lease'; fresh = true; continue;
        }
        const terminal = terminalMessage(error);
        if (terminal) { this.fail(terminal); return; }
        // A rejected/expired handle cannot trap the room in an endless resume loop.
        if (handle) fresh = true;
        this.consecutiveFailures += 1;
        const rateLimited = isRateLimited(error);
        if (rateLimited) this.rateLimitCount += 1;
        const retryMs = rateLimited ? 60_000 : Math.min(15_000, 750 * 2 ** Math.min(this.consecutiveFailures - 1, 5));
        if (rateLimited) this.retryNotBefore = Math.max(this.retryNotBefore, Date.now() + retryMs);
        this.emit({ status: 'reconnecting', notice: rateLimited
          ? 'Dịch vụ đang giới hạn lượt kết nối. Phòng sẽ tự thử lại sau một phút.'
          : 'Kết nối chưa ổn định. Đang tự khôi phục cuộc trò chuyện…' });
        await this.wait(retryMs);
      }
      if (!first || this.connectedOnce) this.reconnectCount += 1;
      first = false;
    }
  }

  private async openSocket(backend: AiConversationSession, handle: string | undefined, epoch: number) {
    const earlyMessages: LiveMessage[] = [];
    let reject!: (error: Error) => void;
    const failure = new Promise<never>((_, fail) => { reject = fail; });
    const attempt: Attempt = { epoch, accepted: false, cancelled: false, reject, controller: new AbortController() };
    this.attempt = attempt;
    const valid = () => this.current(epoch) && this.attempt === attempt && !attempt.cancelled;
    const failed = (error: LiveFailure) => {
      if (!valid()) return;
      if (!attempt.accepted) reject(error);
      else {
        this.disconnectCount += 1;
        this.reconnectCount += 1;
        if (isRateLimited(error)) {
          this.rateLimitCount += 1;
          this.retryNotBefore = Date.now() + 60_000;
        }
        this.cancelAttempt();
        void this.saveHistory();
        void this.recover('disconnect');
      }
    };
    const timeout = setTimeout(() => reject(new LiveFailure('setup_timeout')), SETUP_TIMEOUT);
    try {
      const opening = this.connectLive(backend, handle, this.options.voice, {
        onmessage: (message) => {
          if (!valid()) return;
          if (attempt.accepted) this.message(message);
          else if (earlyMessages.length < 128) earlyMessages.push(message);
        },
        onerror: (event) => failed(new LiveFailure(event.message || 'socket_error')),
        onclose: (event) => failed(new LiveFailure(event.reason || 'socket_closed', event.code)),
      }, attempt.controller.signal);
      // A transport may resolve after our timeout/cancel. Never adopt that stale socket.
      void opening.then((link) => {
        attempt.link = link;
        if (!valid()) link.close();
      }, () => {});
      const link = await Promise.race([opening, failure]);
      if (!valid()) { link.close(); throw new LiveFailure('cancelled'); }
      attempt.link = link;
      attempt.accepted = true;
      this.link = link;
      for (const message of earlyMessages) this.message(message);
    } catch (error) {
      attempt.cancelled = true;
      attempt.controller.abort();
      try { attempt.link?.close(); } catch { /* ignored */ }
      throw error;
    } finally { clearTimeout(timeout); }
  }

  private message(message: LiveMessage) {
    const checkpoint = message.sessionResumptionUpdate;
    if (checkpoint) {
      this.resumable = checkpoint.resumable === true;
      if (checkpoint.resumable && checkpoint.newHandle) this.handle = checkpoint.newHandle;
    }
    if (message.goAway) {
      const remaining = parseFloat(message.goAway.timeLeft ?? '10');
      this.goAwayAt = Date.now() + Math.max(0, (Number.isFinite(remaining) ? remaining : 10) * 1_000 - 2_000);
    }
    const content = message.serverContent;
    if (content) {
      this.lastContentAt = Date.now();
      this.appendTranscript('user', content.inputTranscription?.text);
      this.appendTranscript('ai', content.outputTranscription?.text);
      if (!this.running) return;
      if (content.interrupted) {
        this.responding = false;
        this.turnComplete = true;
        this.audio.clearPlayback();
      }
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
          clearTimeout(this.echoTimer);
          this.responding = true;
          this.turnComplete = false;
          this.setMicMuted(true);
          this.audio.play(part.inlineData.data);
          this.emit({ status: 'speaking' });
        }
      }
      if (content.turnComplete || content.interrupted) {
        this.turnComplete = true;
        this.responding = false;
        this.waitingSince = this.lastSpeechAt = 0;
        this.activeUser = this.activeAi = undefined;
        this.releaseMic();
        this.scheduleSave(0);
      }
    }
    if (message.usageMetadata) {
      this.inputTokens = message.usageMetadata.promptTokenCount ?? this.inputTokens;
      this.outputTokens = message.usageMetadata.responseTokenCount ?? this.outputTokens;
    }
  }

  private appendTranscript(role: 'user' | 'ai', chunk?: string) {
    if (!chunk || (!chunk.trim() && !(role === 'user' ? this.activeUser : this.activeAi))) return;
    const activeId = role === 'user' ? this.activeUser : this.activeAi;
    const lines = [...this.view.transcript];
    const index = activeId ? lines.findIndex((line) => line.id === activeId) : -1;
    if (index >= 0) {
      const previous = lines[index]!;
      const text = chunk.startsWith(previous.text) && previous.text.length > 8 ? chunk : previous.text + chunk;
      lines[index] = { ...previous, text };
    } else {
      const line = { id: crypto.randomUUID(), role, text: chunk };
      const aiIndex = role === 'user' && this.activeAi ? lines.findIndex((entry) => entry.id === this.activeAi) : -1;
      if (aiIndex >= 0) lines.splice(aiIndex, 0, line); else lines.push(line);
      if (role === 'user') this.activeUser = line.id; else this.activeAi = line.id;
    }
    if (lines.length > HISTORY_TURNS || lines.some((line) => line.text.length > 8_000)
        || lines.reduce((size, line) => size + line.text.length, 0) > HISTORY_CHARS) {
      // Persist the last valid snapshot on stop, never replace it with an invalid one.
      this.fail('Cuộc trò chuyện đã đạt giới hạn ngữ cảnh. Lịch sử vẫn được giữ; hãy đóng phòng và chọn “Bắt đầu cuộc trò chuyện mới” để tiếp tục học.');
      return;
    }
    this.revision += 1;
    this.emit({ transcript: lines });
    this.scheduleSave();
  }

  private setMicMuted(muted: boolean) {
    if (muted && !this.micMuted && this.link) {
      try { this.link.sendRealtimeInput({ audioStreamEnd: true }); } catch { /* recovery handles the socket */ }
    }
    this.micMuted = muted;
    this.audio.setMuted(muted);
  }
  private releaseMic() {
    if (!this.running || !this.turnComplete || this.audio.playing) return;
    clearTimeout(this.echoTimer);
    this.echoTimer = setTimeout(() => {
      if (!this.running || !this.turnComplete || this.audio.playing) return;
      this.setMicMuted(!this.connectedOnce);
      if (this.link) this.emit({ status: 'listening' });
    }, 400);
  }
  private onPcm(data: string) {
    if (!this.running || this.micMuted) return;
    const decoded = atob(data);
    let energy = 0;
    for (let index = 0; index + 1 < decoded.length; index += 2) {
      let sample = decoded.charCodeAt(index) | decoded.charCodeAt(index + 1) << 8;
      if (sample >= 32768) sample -= 65536;
      energy += (sample / 32768) ** 2;
    }
    const speech = Math.sqrt(energy / Math.max(1, decoded.length / 2)) > 0.015;
    if (speech) { this.lastSpeechAt = Date.now(); this.waitingSince ||= Date.now(); }
    if (this.link && !this.flushing) {
      try { this.link.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } }); return; }
      catch { this.disconnectCount += 1; void this.recover('disconnect'); }
    }
    if (!this.connectedOnce) return;
    this.buffered.push({ data, bytes: decoded.length, speech });
    this.bufferedBytes += decoded.length;
    while (this.bufferedBytes > BUFFER_BYTES) {
      const dropped = this.buffered.shift()!;
      this.bufferedBytes -= dropped.bytes;
      this.lostBufferedSpeech ||= dropped.speech;
    }
  }
  private async flushBuffered(epoch: number) {
    if (!this.link || !this.buffered.length) return;
    if (!this.buffered.some((frame) => frame.speech)) {
      this.buffered = [];
      this.bufferedBytes = 0;
      return;
    }
    const link = this.link;
    const token = Symbol('replay');
    this.flushing = token;
    try {
      // Four-times realtime replay, yielding between frames so the WebSocket can drain.
      // New microphone frames join the same FIFO instead of overtaking older speech.
      while (this.current(epoch) && this.flushing === token && this.buffered.length) {
        if (this.link !== link) throw new LiveFailure('replay_connection_lost');
        const frame = this.buffered[0]!;
        link.sendRealtimeInput({ audio: { data: frame.data, mimeType: 'audio/pcm;rate=16000' } });
        this.buffered.shift();
        this.bufferedBytes -= frame.bytes;
        await new Promise<void>((resolve) => setTimeout(resolve, Math.max(5, Math.ceil(frame.bytes / 128))));
      }
      if (!this.current(epoch) || this.flushing !== token) return;
      if (this.link !== link) throw new LiveFailure('replay_connection_lost');
      link.sendRealtimeInput({ audioStreamEnd: true });
      this.waitingSince = Date.now();
      this.lastSpeechAt = Date.now();
    } finally { if (this.flushing === token) this.flushing = undefined; }
  }

  private scheduleSave(delay = 2_000) {
    if (this.saveTimer && delay) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { this.saveTimer = undefined; void this.saveHistory(); }, delay);
  }
  private async saveHistory(): Promise<void> {
    if (this.saving) return this.saving;
    const backend = this.backend;
    if (!backend || (this.savedRevisions.get(backend.sessionId) ?? -1) >= this.revision) return;
    const revision = this.revision;
    const epoch = this.epoch;
    const task = (async () => {
      try {
        await this.api.saveHistory(backend.sessionId, { turns: this.view.transcript.map((turn) => ({ ...turn })), revision });
        if (this.epoch === epoch) this.savedRevisions.set(backend.sessionId, Math.max(this.savedRevisions.get(backend.sessionId) ?? -1, revision));
      } catch (error) {
        const terminal = terminalMessage(error);
        if (this.current(epoch) && terminal) this.fail(terminal);
      }
    })();
    this.saving = task;
    await task;
    if (this.saving === task) this.saving = undefined;
    if (this.current(epoch) && (this.savedRevisions.get(this.backend?.sessionId ?? '') ?? -1) < this.revision) this.scheduleSave(4_000);
  }
  private metrics() {
    return { summary: JSON.stringify({ current_topic: this.options.topic, history_revision: this.revision }),
      inputTokens: this.inputTokens, outputTokens: this.outputTokens, connectLatencyMs: this.connectLatencyMs,
      reconnectCount: this.reconnectCount, disconnectCount: this.disconnectCount, rateLimitCount: this.rateLimitCount };
  }
  private tick() {
    if (!this.running) return;
    const expiry = this.backend ? Date.parse(this.backend.expiresAt) : 0;
    this.emit({ secondsLeft: Math.max(0, Math.ceil((expiry - Date.now()) / 1_000)) });
    if (this.link && Date.now() - this.lastConnectedAt > 30_000) this.consecutiveFailures = 0;
    if (expiry && Date.now() >= expiry) {
      if (this.backend!.handoffSecondsBeforeExpiry <= 0) this.fail('Bạn đã dùng hết thời lượng AI Voice hôm nay. Hạn mức đặt lại lúc 00:00.');
      else if (!this.recovering) void this.recover('lease', true);
      return;
    }
    if (this.recovering) return;
    const quiet = this.turnComplete && !this.audio.playing && Date.now() - this.lastSpeechAt > 800;
    if (this.goAwayAt && ((quiet && this.resumable) || Date.now() >= this.goAwayAt)) {
      void this.recover('goAway'); return;
    }
    // Silence from a silent learner is normal. Watch only an unanswered spoken turn or stuck generation.
    if (this.link && (this.waitingSince || this.responding) && !this.audio.playing
        && Date.now() - Math.max(this.lastContentAt, this.lastSpeechAt, this.waitingSince) > 25_000) {
      this.disconnectCount += 1;
      void this.recover('disconnect', true);
    }
  }
  networkChanged = () => {
    if (!this.running) return;
    if (this.online()) {
      this.wakeRetry?.();
      if (!this.link && !this.recovering) void this.recover('disconnect');
      void this.audio.resume().catch(() => this.audioPaused());
    } else if (this.link) void this.recover('disconnect');
  };
  resumeAudio = () => {
    if (this.running) void this.audio.resume().then(() => {
      this.releaseMic();
      this.networkChanged();
    }).catch(() => this.audioPaused());
  };
  private audioPaused() {
    if (this.running) this.emit({ notice: 'Trình duyệt đang tạm dừng âm thanh. Chạm “Tiếp tục âm thanh” để mở lại.' });
  }
  private audioFailed(error: unknown) {
    if (this.running) this.fail(microphoneMessage(error));
  }
  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const done = () => { clearTimeout(timer); if (this.wakeRetry === done) this.wakeRetry = undefined; resolve(); };
      const timer = setTimeout(done, ms + Math.round(Math.random() * Math.min(500, ms / 5)));
      this.wakeRetry = done;
    });
  }
}

function isRateLimited(error: unknown) {
  const value = error as { status?: number; message?: string };
  return value?.status === 429 || /429|resource.?exhausted|quota|rate.?limit/i.test(value?.message ?? '');
}
function terminalMessage(error: unknown): string | undefined {
  const value = error as { status?: number; code?: string; message?: string; details?: { reason?: string } };
  if (value?.details?.reason === 'AI_HISTORY_LIMIT') return 'Cuộc trò chuyện đã đạt giới hạn ngữ cảnh. Lịch sử vẫn được giữ; hãy đóng phòng và chọn “Bắt đầu cuộc trò chuyện mới” để tiếp tục học.';
  if (value?.status === 401 || value?.status === 403) return value.message || 'Vui lòng đăng nhập lại hoặc kiểm tra quyền AI Voice.';
  if (/dùng hết|hết thời lượng/i.test(value?.message ?? '')) return value.message;
  if (value?.status === 400 || value?.status === 404 || value?.status === 409) return value.message || 'Không thể khôi phục phòng này. Hãy mở phòng mới.';
  return undefined;
}
function microphoneMessage(error: unknown) {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Chưa được cấp quyền micro. Hãy tắt cửa sổ nổi, cho phép micro rồi thử lại.';
  if (name === 'NotFoundError') return 'Không tìm thấy micro trên thiết bị.';
  if (name === 'NotReadableError') return 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
  return 'Âm thanh bị gián đoạn. Hãy kiểm tra micro và chạm để bắt đầu lại.';
}
