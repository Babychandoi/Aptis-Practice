#!/usr/bin/env node

/**
 * Benchmark luồng tạo attempt + hai autosave song song bằng Node 20, không cần
 * cài thêm package. Chỉ chạy trên staging/test vì script tạo dữ liệu thật.
 *
 * Ví dụ PowerShell:
 *   $env:APTIS_BENCH_EMAIL='student@test.local'
 *   $env:APTIS_BENCH_PASSWORD='password'
 *   $env:APTIS_BENCH_PART_ID='16000000-0000-4000-8000-000000000021'
 *   node scripts/benchmark-practice.mjs
 */

const baseUrl = process.env.APTIS_BENCH_BASE_URL ?? 'http://localhost:8080/api/v1';
const email = process.env.APTIS_BENCH_EMAIL;
const password = process.env.APTIS_BENCH_PASSWORD;
const partId = process.env.APTIS_BENCH_PART_ID;
const concurrency = positiveInt('APTIS_BENCH_CONCURRENCY', 5);
const iterations = positiveInt('APTIS_BENCH_ITERATIONS', 10);
const p95LimitMs = positiveInt('APTIS_BENCH_P95_LIMIT_MS', 2_000);

if (!email || !password || !partId) {
  console.error(
    'Thiếu APTIS_BENCH_EMAIL, APTIS_BENCH_PASSWORD hoặc APTIS_BENCH_PART_ID.',
  );
  process.exit(2);
}

const metrics = new Map();
const failures = [];

const login = await timed('login', () => request('/auth/login', {
  method: 'POST',
  body: { email, password, deviceId: `benchmark-${Date.now()}` },
}));
const accessToken = login.accessToken;

await Promise.all(Array.from({ length: concurrency }, (_, worker) => runWorker(worker)));

const report = Object.fromEntries([...metrics.entries()].map(([name, values]) => [
  name,
  summarize(values),
]));
console.log(JSON.stringify({
  baseUrl,
  concurrency,
  iterationsPerWorker: iterations,
  totalFlows: concurrency * iterations,
  failures: failures.length,
  metrics: report,
}, null, 2));

const worstP95 = Math.max(...Object.values(report).map((item) => item.p95Ms), 0);
if (failures.length > 0) {
  console.error('\nLỗi mẫu:', failures.slice(0, 10));
}
if (failures.length > 0 || worstP95 > p95LimitMs) {
  console.error(`Benchmark không đạt: p95 cao nhất ${worstP95} ms, giới hạn ${p95LimitMs} ms.`);
  process.exit(1);
}

async function runWorker(worker) {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    try {
      const attempt = await timed('createAttempt', () => authorized(
        '/practice/part-attempts',
        {
          method: 'POST',
          body: {
            partId,
            questionSetCount: 2,
            onlyIncorrect: false,
            onlyNew: false,
            timed: false,
          },
        },
      ));
      const started = await timed('startAttempt', () => authorized(
        `/attempts/${attempt.id}/start`, { method: 'POST' },
      ));
      const targets = started.questionSets.slice(0, 2);
      if (targets.length === 0) {
        throw new Error('Attempt không có question set để benchmark autosave');
      }

      const writes = targets.map((questionSet, index) => {
        const item = questionSet.content?.items?.[0];
        if (!item) throw new Error(`Question set ${questionSet.questionSetId} không có item`);
        return timed('autosave', () => authorized(
          `/attempts/${attempt.id}/responses/${questionSet.questionSetId}`,
          {
            method: 'PUT',
            body: {
              itemResponses: [answerFor(item, worker, iteration, index)],
              timeSpentSeconds: iteration + 1,
            },
          },
        ));
      });
      await Promise.all(writes);

      const reloaded = await timed('reloadAttempt', () => authorized(
        `/attempts/${attempt.id}`,
      ));
      for (const target of targets) {
        const saved = reloaded.questionSets.find(
          (questionSet) => questionSet.questionSetId === target.questionSetId,
        )?.savedResponse?.itemResponses;
        if (!saved || saved.length === 0) {
          throw new Error(`Mất autosave của question set ${target.questionSetId}`);
        }
      }
    } catch (error) {
      failures.push({ worker, iteration, message: error.message });
    }
  }
}

function answerFor(item, worker, iteration, index) {
  const common = { itemId: item.id, responseType: item.responseType };
  const options = item.options ?? [];
  switch (item.responseType) {
    case 'SINGLE_CHOICE':
    case 'GAP_FILL_CHOICE':
      return { ...common, selectedOptionId: options[0]?.id };
    case 'MULTIPLE_CHOICE':
      return { ...common, selectedOptionIds: options.slice(0, 1).map((option) => option.id) };
    case 'MATCHING': {
      const rightItems = item.rightItems ?? [];
      return {
        ...common,
        matches: Object.fromEntries((item.leftItems ?? []).map((left, position) => [
          left.id,
          rightItems[position % Math.max(rightItems.length, 1)]?.id,
        ]).filter(([, value]) => value)),
      };
    }
    case 'ORDERING':
    case 'SENTENCE_ORDERING':
      return { ...common, orderedOptionIds: options.map((option) => option.id) };
    case 'SHORT_TEXT':
    case 'TEXT_EXACT':
    case 'LONG_TEXT':
      return { ...common, textValue: `benchmark-${worker}-${iteration}-${index}` };
    default:
      throw new Error(`Benchmark chưa hỗ trợ responseType ${item.responseType}`);
  }
}

async function authorized(path, options = {}) {
  return request(path, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) },
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} -> ${response.status}: ${await response.text()}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function timed(name, operation) {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    const values = metrics.get(name) ?? [];
    values.push(performance.now() - startedAt);
    metrics.set(name, values);
  }
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    minMs: round(sorted[0] ?? 0),
    averageMs: round(sorted.reduce((sum, value) => sum + value, 0) / Math.max(sorted.length, 1)),
    p50Ms: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted.at(-1) ?? 0),
  };
}

function percentile(sorted, ratio) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(Math.ceil(sorted.length * ratio) - 1, sorted.length - 1)];
}

function positiveInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
