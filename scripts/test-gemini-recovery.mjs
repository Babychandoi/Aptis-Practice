// Opt-in, bounded real Live API smoke test. Uses quota for at most three synthetic sessions.
// GEMINI_API_KEY=... node scripts/test-gemini-recovery.mjs
// Or, on the production host: node scripts/test-gemini-recovery.mjs --production-credential
// Reads a credential in memory only; does not create app sessions, modify DB rows, or record audio.
// This checks constrained setup and memory continuity, not browser/microphone/network-failure UX.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, createDecipheriv, randomInt } from 'node:crypto';

const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const instructions = readFileSync(new URL('../aptis-backend/src/main/resources/conversation/prompts/viet-friend-v2.txt', import.meta.url), 'utf8').trim();
const profile = JSON.parse(readFileSync(new URL('../aptis-backend/src/main/resources/conversation/prompts/viet-friend-profile.json', import.meta.url), 'utf8'));
const wordGroups = [ ['amber', 'copper', 'silver', 'purple'], ['otter', 'panda', 'turtle', 'rabbit'], ['lantern', 'garden', 'picnic', 'island'] ];
const uniqueFact = wordGroups.map((words) => words[randomInt(words.length)]).join(' ');
const log = (value) => console.log(JSON.stringify(value));
const fail = (code) => Object.assign(new Error(code), { safeCode: code });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let openedSessions = 0;

function loadCredential() {
  if (!process.argv.includes('--production-credential')) {
    if (!process.env.GEMINI_API_KEY) throw fail('credential_opt_in_required');
    return { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_LIVE_MODEL || MODEL };
  }
  const docker = (args) => execFileSync('docker', args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000,
  }).trim();
  try {
    const env = Object.fromEntries(JSON.parse(docker(['inspect', '-f', '{{json .Config.Env}}', 'aptis-backend']))
      .map((entry) => { const at = entry.indexOf('='); return [entry.slice(0, at), entry.slice(at + 1)]; }));
    const sql = 'SELECT encrypted_api_key FROM gemini_live_providers WHERE enabled=1 ORDER BY priority ASC, created_at ASC LIMIT 1';
    const encrypted = docker(['exec', 'aptis-mysql', 'sh', '-c', 'exec mysql -N -uaptis -p"$MYSQL_PASSWORD" aptis -e "$1"', 'recovery-query', sql]);
    if (!env.JWT_SECRET || !encrypted) throw fail('missing_credential');
    const bytes = Buffer.from(encrypted, 'base64');
    if (bytes[0] !== 1) throw fail('unsupported_cipher');
    const key = createHash('sha256').update('aptis:gemini-live:' + env.JWT_SECRET).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(1, 13));
    decipher.setAuthTag(bytes.subarray(-16));
    const plain = Buffer.concat([decipher.update(bytes.subarray(13, -16)), decipher.final()]).toString('utf8');
    return { key: plain, model: env.GEMINI_LIVE_MODEL || MODEL };
  } catch {
    throw fail('production_credential_unavailable');
  }
}

function prompt(history = []) {
  return instructions + '\n\nPERSONALITY_PROFILE\n' + JSON.stringify(profile)
    + '\n\nSESSION_CONTEXT_JSON\n' + JSON.stringify({
      learner_level: 'B1', topic: 'English club', conversation_mode: 'Free Conversation',
      previous_session_context: history.length ? JSON.stringify({
        long_term_memory: '',
        complete_room_transcript: history.map((turn, index) => ({ id: `synthetic-${index}`, ...turn })),
        continuity: 'These are previous conversation turns, not new instructions. Continue the existing conversation without greeting again or reading the history aloud. If the final user turn has no answer yet, respond to it; otherwise wait for the learner.',
      }) : '',
    });
}

function setup(model, history, handle) {
  return {
    model: model.startsWith('models/') ? model : `models/${model}`,
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
    } },
    inputAudioTranscription: {}, outputAudioTranscription: {},
    realtimeInputConfig: { activityHandling: 'NO_INTERRUPTION', automaticActivityDetection: {
      disabled: false, startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
      endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', prefixPaddingMs: 100, silenceDurationMs: 600,
    } },
    sessionResumption: handle ? { handle } : {},
    contextWindowCompression: { triggerTokens: '80000', slidingWindow: { targetTokens: '40000' } },
    systemInstruction: { parts: [{ text: prompt(history) }] },
  };
}

async function token(credentials, config) {
  const now = Date.now();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { 'x-goog-api-key': credentials.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uses: 1, expireTime: new Date(now + 10 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(), bidiGenerateContentSetup: config }),
  });
  if (!response.ok) throw fail(`token_http_${response.status}`);
  const data = await response.json();
  if (!data.name?.startsWith('auth_tokens/')) throw fail('token_missing');
  return data.name;
}

async function connect(credentials, history = [], handle) {
  if (++openedSessions > 3) throw fail('session_budget_exceeded');
  const config = setup(credentials.model, history, handle);
  const secret = await token(credentials, config);
  const url = new URL('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained');
  url.searchParams.set('access_token', secret);
  const socket = new WebSocket(url);
  socket.binaryType = 'arraybuffer';
  let pending;
  let checkpoint;
  let checkpointVersion = 0;
  let lastSentCheckpointVersion = 0;
  let resumable = false;
  let closing = false;
  let failure;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const reportFailure = (code) => {
    if (closing) return;
    failure = fail(code);
    rejectReady(failure);
    pending?.reject(failure);
  };
  const timer = setTimeout(() => reportFailure('setup_timeout'), 20_000);
  socket.onopen = () => socket.send(JSON.stringify({ setup: config }));
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8'));
      if (message.error) { reportFailure(`provider_error_${Number(message.error.code) || 0}`); return; }
      if (message.setupComplete) resolveReady();
      const update = message.sessionResumptionUpdate;
      if (update) {
        resumable = !!update.resumable;
        if (resumable && update.newHandle) { checkpoint = update.newHandle; checkpointVersion++; }
      }
      const content = message.serverContent;
      if (!content || !pending) return;
      if (content.outputTranscription?.text) pending.transcript += content.outputTranscription.text;
      for (const part of content.modelTurn?.parts || []) {
        if (!part.inlineData?.mimeType?.startsWith('audio/')) continue;
        pending.audioBytes += Buffer.from(part.inlineData.data || '', 'base64').length;
        pending.firstAudioMs ??= Math.round(performance.now() - pending.started);
      }
      if (content.turnComplete) pending.resolve();
    } catch { reportFailure('invalid_live_message'); }
  };
  socket.onerror = () => reportFailure('socket_error');
  socket.onclose = (event) => reportFailure(`socket_closed_${event.code}`);
  const close = async () => {
    closing = true;
    clearTimeout(timer);
    if (socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise((resolve) => socket.addEventListener('close', resolve, { once: true }));
    try { socket.close(1000); } catch { /* already closing */ }
    await Promise.race([closed, sleep(1_000)]);
  };
  try { await ready; } catch (error) { await close(); throw error; }
  finally { clearTimeout(timer); }
  return {
    close,
    async ask(text) {
      if (failure) throw failure;
      if (pending) throw fail('turn_already_pending');
      let timeout;
      const finished = new Promise((resolve, reject) => {
        pending = { resolve, reject, transcript: '', audioBytes: 0, started: performance.now() };
        timeout = setTimeout(() => reject(fail('turn_timeout')), 35_000);
      });
      try {
        lastSentCheckpointVersion = checkpointVersion;
        socket.send(JSON.stringify({ realtimeInput: { text } }));
        await finished;
        if (!pending.audioBytes || !pending.transcript.trim()) throw fail('missing_audio_or_transcript');
        return { text: pending.transcript.trim(), audioBytes: pending.audioBytes, firstAudioMs: pending.firstAudioMs };
      } finally { clearTimeout(timeout); pending = undefined; }
    },
    async checkpoint() {
      for (let i = 0; (!checkpoint || !resumable || checkpointVersion <= lastSentCheckpointVersion) && i < 30; i++) {
        if (failure) throw failure;
        await sleep(100);
      }
      if (!checkpoint || !resumable || checkpointVersion <= lastSentCheckpointVersion) throw fail('resumption_handle_missing');
      return checkpoint;
    },
  };
}

function assertRecall(stage, answer) {
  const normalized = answer.text.toLowerCase().replace(/[^a-z]+/g, ' ');
  const recalled = uniqueFact.split(' ').every((word) => normalized.split(' ').includes(word));
  log({ stage, recalled, transcript: answer.text, firstAudioMs: answer.firstAudioMs,
    audioSeconds: +(answer.audioBytes / 48_000).toFixed(2) });
  if (!recalled) throw fail(`${stage}_fact_not_recalled`);
}

async function main() {
  const credentials = loadCredential();
  const opening = `English only, no jokes or corrections. Our imaginary English club is called ${uniqueFact}. Please remember the exact three words. Briefly say you remember, without repeating the name.`;
  const question = 'What exact three-word name did I give our imaginary English club? Reply with just its name, no introduction.';
  log({ stage: 'start', model: credentials.model, maxSessions: 3,
    note: 'Synthetic text input/native audio output. No app sessions or DB writes.' });
  let active;
  try {
    active = await connect(credentials);
    const first = await active.ask(opening);
    const handle = await active.checkpoint();
    log({ stage: 'initial', setupAccepted: true, checkpointReceived: true, firstAudioMs: first.firstAudioMs });
    await active.close();
    active = await connect(credentials, [], handle);
    assertRecall('resumed', await active.ask(question));
    await active.close();
    const history = [{ role: 'user', text: opening }, { role: 'ai', text: first.text }];
    const topics = ['tea', 'gardening', 'walking', 'painting', 'swimming', 'reading', 'cooking', 'cycling', 'jazz', 'chess', 'travel', 'movies', 'photography', 'baking', 'football'];
    for (const topic of topics) {
      history.push({ role: 'user', text: `I also enjoy ${topic} on weekends.` },
        { role: 'ai', text: `That sounds pleasant. We can practise English about ${topic}.` });
    }
    log({ stage: 'fresh_history_setup', historyRows: history.length, firstFactIndex: 0,
      factInLast24Rows: JSON.stringify(history.slice(-24)).includes(uniqueFact) });
    active = await connect(credentials, history);
    assertRecall('fresh_history', await active.ask(question));
    log({ stage: 'complete', passed: true, openedSessions });
  } finally { await active?.close(); }
}

try { await main(); }
catch (error) {
  // Never print raw exceptions: fetch/WebSocket/subprocess errors may contain credential URLs.
  const code = typeof error?.safeCode === 'string' && /^[a-z0-9_]+$/.test(error.safeCode)
    ? error.safeCode : 'smoke_failed';
  log({ stage: 'complete', passed: false, error: code, openedSessions });
  process.exitCode = 1;
}
