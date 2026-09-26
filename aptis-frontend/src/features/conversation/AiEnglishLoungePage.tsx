import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { aiConversationApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useGeminiLiveConversation, type ConversationStatus } from './useGeminiLiveConversation';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { Icon, type IconName } from '@/components/shell/icons';

export function AiEnglishLoungePage() {
  const access = useQuery({ queryKey: ['ai-conversation', 'access'], queryFn: aiConversationApi.access });
  if (access.isPending) return <LoadingBlock label="Đang kiểm tra quyền AI Voice…" />;
  if (!access.data?.allowed) return <ComingSoon />;
  return <VoiceLounge configured={access.data.configured} dailyLimitSeconds={access.data.dailyLimitSeconds} dailyRemainingSeconds={access.data.dailyRemainingSeconds} onUsageChanged={() => void access.refetch()} />;
}

/** Chủ đề gợi ý lấy từ mock; ô cuối cho học viên tự gõ chủ đề khác. */
const TOPICS = ['Luyện Speaking Part 1', 'Sửa email Writing Part 4', 'Giải thích ngữ pháp', 'Phỏng vấn thử', 'Trò chuyện tự do'];
const VOICES = [
  { value: 'Aoede', label: 'Giọng nữ' },
  { value: 'Puck', label: 'Giọng nam' },
];
const voiceLabel = (voice: string) => (voice === 'Puck' ? 'Giọng nam' : 'Giọng nữ');
const KICKER = 'text-[11px] font-semibold uppercase tracking-[0.12em]';

/** Lounge không có chat chữ: khung bên phải giải thích cách gọi thoại hoạt động. */
const HOW_IT_WORKS: [IconName, string][] = [
  ['mic', 'Bấm "Bắt đầu gọi thoại", rồi chạm mic để cấp quyền micro.'],
  ['chat', 'Cứ nói tự nhiên bằng tiếng Anh. Mic luôn mở, AI tự trả lời khi bạn ngừng nói.'],
  ['listening', 'Khi AI đang nói, mic tạm nghỉ và tự mở lại khi AI nói xong.'],
  ['clock', 'Không chấm điểm. Hết phút trong ngày thì cuộc gọi tự kết thúc.'],
];

function VoiceLounge({ configured, dailyLimitSeconds, dailyRemainingSeconds, onUsageChanged }: { configured: boolean; dailyLimitSeconds: number; dailyRemainingSeconds: number; onUsageChanged: () => void }) {
  const [topic, setTopic] = useState('Trò chuyện tự do');
  const [level, setLevel] = useState('B1');
  const [voice, setVoice] = useState('Aoede');
  const [freshStart, setFreshStart] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const limitMin = Math.round(dailyLimitSeconds / 60);
  const usedMin = Math.max(0, limitMin - Math.ceil(dailyRemainingSeconds / 60));
  const custom = !TOPICS.includes(topic);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="relative flex animate-in flex-col gap-5 overflow-hidden rounded-3xl bg-ink p-6 text-white">
          <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 animate-spin-slow rounded-full border border-dashed border-white/10" />
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Icon name="spark" /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">AI English Lounge</h1>
            <p className="mt-2 text-sm leading-6 text-white/70">Luyện phản xạ giao tiếp bằng giọng nói với AI. Tối đa {limitMin} phút mỗi ngày.</p>
          </div>

          {!configured && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-100">Hệ thống Gemini Live chưa sẵn sàng. Vui lòng báo quản trị viên.</p>}

          <div>
            <p className={`mb-2 ${KICKER} text-white/50`}>Giọng AI</p>
            <div role="radiogroup" aria-label="Giọng AI" className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
              {VOICES.map((v) => (
                <button key={v.value} type="button" role="radio" aria-checked={voice === v.value} onClick={() => setVoice(v.value)}
                  className={voice === v.value ? 'min-h-[40px] rounded-full bg-white text-sm font-semibold text-ink' : 'min-h-[40px] rounded-full text-sm font-semibold text-white/70 hover:text-white'}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor="lounge-level" className="block">
            <span className={`mb-2 block ${KICKER} text-white/50`}>Trình độ</span>
            <select id="lounge-level" className="min-h-[44px] w-full rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option className="text-ink">A2</option><option className="text-ink">B1</option><option className="text-ink">B2</option><option className="text-ink">C1</option>
            </select>
          </label>

          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-white/70">Đã dùng hôm nay</span>
              <strong>{usedMin}/{limitMin} phút</strong>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15">
              <span className="block h-full origin-left animate-grow-x rounded-full bg-green-500" style={{ width: `${limitMin ? (usedMin / limitMin) * 100 : 0}%` }} />
            </span>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-white/80">
            <input type="checkbox" className="mt-1" checked={freshStart} onChange={(event) => setFreshStart(event.target.checked)} />
            <span>
              Bắt đầu cuộc trò chuyện mới
              <span className="block text-xs text-white/50">Mặc định AI nhớ cuộc trò chuyện gần nhất. Lịch sử đã lưu không bị xoá.</span>
            </span>
          </label>

          <button type="button" className="btn min-h-[52px] rounded-full bg-white text-ink hover:bg-surface-muted" disabled={!configured || dailyRemainingSeconds <= 0} onClick={() => setStudioOpen(true)}>
            <Icon name="mic" className="h-4 w-4" />
            {dailyRemainingSeconds <= 0 ? 'Đã hết phút hôm nay' : 'Bắt đầu gọi thoại'}
          </button>
        </section>

        <section className="flex animate-in flex-col gap-2 rounded-3xl border border-border bg-white p-4 [animation-delay:80ms]">
          <p className={`${KICKER} text-ink-faint`}>Chủ đề gợi ý</p>
          <ul className="flex flex-col gap-2">
            {TOPICS.map((t) => (
              <li key={t}>
                <button type="button" onClick={() => setTopic(t)} aria-pressed={topic === t}
                  className={topic === t
                    ? 'flex min-h-[44px] w-full items-center justify-between rounded-xl border border-ink bg-surface-muted px-3.5 text-left text-sm font-semibold'
                    : 'flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border px-3.5 text-left text-sm font-medium hover:border-brand-300'}>
                  {t}
                  <Icon name="arrow" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <label htmlFor="lounge-topic" className="mt-1 block">
            <span className="label">Hoặc chủ đề của bạn</span>
            <input id="lounge-topic" className="input" maxLength={100} placeholder="Ví dụ: kể về chuyến du lịch gần nhất" value={custom ? topic : ''} onChange={(e) => setTopic(e.target.value || 'Trò chuyện tự do')} />
          </label>
        </section>
      </div>

      <section className="flex min-w-0 animate-in flex-col rounded-3xl border border-border bg-white [animation-delay:120ms]">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          <strong className="text-sm">English partner</strong>
          <span className="text-xs text-ink-faint">· {voiceLabel(voice)} · {voice}</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
          <p className={`${KICKER} text-ink-faint`}>Cách hoạt động</p>
          <ol className="flex flex-col gap-3">
            {HOW_IT_WORKS.map(([icon, text], i) => (
              <li key={text} className="flex animate-in-sm items-start gap-3 rounded-2xl bg-surface-paper px-4 py-3 text-sm text-ink-soft" style={{ animationDelay: `${160 + i * 60}ms` }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white"><Icon name={icon} className="h-4 w-4" /></span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-auto rounded-2xl border border-border px-4 py-3 text-sm text-ink-mute">
            Đang chọn: <strong className="text-ink">{topic}</strong> · {level} · {voiceLabel(voice)}
          </p>
        </div>
      </section>

      {studioOpen && <VoiceStudioModal topic={topic} level={level} voice={voice} freshStart={freshStart} dailyRemainingSeconds={dailyRemainingSeconds} onClose={() => { setStudioOpen(false); onUsageChanged(); }} />}
    </div>
  );
}

type Tone = 'idle' | 'busy' | 'listening' | 'speaking' | 'error';
const toneOf = (status: ConversationStatus): Tone =>
  status === 'connecting' || status === 'reconnecting' || status === 'handoff' ? 'busy' : status;

/** Tiêu đề và gợi ý mô tả đúng hành vi thật: Gemini Live nghe liên tục, không cần chạm mic sau mỗi câu. */
const STATE_TEXT: Record<ConversationStatus, [string, string]> = {
  idle: ['Sẵn sàng', 'Chạm mic để cấp quyền micro và bắt đầu.'],
  connecting: ['Đang kết nối…', 'Đang mở phòng thu với AI, chờ một chút nhé.'],
  reconnecting: ['Đang khôi phục…', 'Mạng chập chờn, AI đang nối lại và giữ nguyên ngữ cảnh.'],
  handoff: ['Đang chuyển phiên…', 'AI đang chuyển sang phiên mới, cuộc trò chuyện vẫn tiếp tục.'],
  listening: ['Đang nghe bạn…', 'Cứ nói tự nhiên, AI tự trả lời khi bạn ngừng nói. Chạm nút để dừng.'],
  speaking: ['AI đang nói', 'Nghe câu trả lời — mic tự mở lại khi AI nói xong.'],
  error: ['Có lỗi', 'Chạm mic để thử lại.'],
};
const DOT: Record<Tone, string> = { idle: 'bg-ink-faint', busy: 'bg-amber-400', listening: 'bg-red-500', speaking: 'bg-green-500', error: 'bg-red-500' };
const BARS = [5, 9, 14, 7, 18, 11, 6, 15, 22, 9, 13, 5, 17, 10, 20, 8, 12, 6, 16, 9, 19, 7, 11, 5];
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function SpeakerIcon() {
  return <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
}

function VoiceStudioModal({ topic, level, voice, freshStart, dailyRemainingSeconds, onClose }: { topic: string; level: string; voice: string; freshStart: boolean; dailyRemainingSeconds: number; onClose: () => void }) {
  const conversation = useGeminiLiveConversation(topic, level, voice, freshStart);
  const { status, transcript } = conversation;
  const tone = toneOf(status);
  const active = status !== 'idle' && status !== 'error';
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Mốc mm:ss của từng lượt chỉ để hiển thị: ghi lại lúc lượt đó xuất hiện lần đầu.
  const [stamps, setStamps] = useState<Record<string, number>>({});

  const close = () => { void conversation.stop(); onClose(); };
  useEscapeKey(() => { void close(); });
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, []);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    setStamps((prev) => {
      const missing = transcript.filter((line) => prev[line.id] == null);
      if (missing.length === 0) return prev;
      const next = { ...prev };
      for (const line of missing) next[line.id] = elapsed;
      return next;
    });
  }, [transcript, elapsed]);

  const [title, hint] = STATE_TEXT[status];
  const minutesLeft = Math.ceil((conversation.secondsLeft > 0 ? conversation.secondsLeft : dailyRemainingSeconds) / 60);
  const last = transcript[transcript.length - 1];
  const streamingId = last?.role === 'ai' && status === 'speaking' ? last.id : null;
  const circle = tone === 'busy' ? 'bg-amber-400 text-ink'
    : tone === 'listening' ? 'bg-red-500 text-white shadow-[0_0_60px_rgba(239,68,68,0.45)]'
    : tone === 'error' ? 'bg-white/10 text-red-300 ring-2 ring-red-400/60'
    : tone === 'speaking' ? 'bg-white text-ink'
    : 'bg-white text-ink hover:scale-105';
  const waving = tone === 'listening' || tone === 'speaking';

  return createPortal(<div className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen animate-in-sm items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Phòng thu hội thoại">
    <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white text-ink shadow-2xl sm:h-[min(760px,94dvh)] sm:rounded-3xl">
      <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-white"><Icon name="spark" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className={`${KICKER} text-ink-faint`}>AI English Lounge</p>
          <h2 className="truncate text-lg font-extrabold tracking-tight">Phòng thu hội thoại</h2>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs" aria-label={`Thời gian gọi ${mmss(elapsed)}`}>
          <span className={`h-2 w-2 rounded-full ${DOT[tone]} ${active ? 'animate-blink' : ''}`} aria-hidden="true" />{mmss(elapsed)}
        </span>
        <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-muted hover:bg-brand-200" onClick={() => void close()} aria-label="Đóng phòng thu"><Icon name="close" className="h-4 w-4" /></button>
      </header>

      {/* Điện thoại: một cột, pane micro ở trên, transcript cuộn bên dưới. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:overflow-hidden">
        <section className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden bg-ink px-5 py-6 text-white">
          <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-spin-slow rounded-full border border-dashed border-white/10" />
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {[topic, `Trình độ ${level}`, `${voiceLabel(voice)} · ${voice}`].map((chip) => <span key={chip} className="max-w-full truncate rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium">{chip}</span>)}
          </div>

          <div className="relative my-6 grid h-[220px] w-[220px] place-items-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full border border-white/10" />
            {waving && <>
              <span aria-hidden="true" className={`absolute inset-8 animate-ping-mic rounded-full ${tone === 'listening' ? 'bg-red-500/30' : 'bg-white/15'}`} />
              <span aria-hidden="true" className={`absolute inset-8 animate-ping-mic rounded-full [animation-delay:.8s] ${tone === 'listening' ? 'bg-red-500/20' : 'bg-white/10'}`} />
            </>}
            {/* Cung xoay quanh nút khi đang kết nối / khôi phục / chuyển phiên. */}
            {tone === 'busy' && <span aria-hidden="true" className="absolute inset-4 animate-spin rounded-full border-[3px] border-transparent border-r-amber-400 border-t-amber-400/60 [animation-duration:1.4s]" />}
            <button type="button" disabled={status === 'connecting' || status === 'handoff'} onClick={() => active ? void conversation.stop() : void conversation.start()}
              className={`relative grid h-[156px] w-[156px] place-items-center rounded-full transition duration-300 disabled:cursor-wait ${circle}`}
              aria-label={active ? 'Dừng trò chuyện' : status === 'error' ? 'Thử lại' : 'Bắt đầu trò chuyện'}>
              {tone === 'listening' ? <span className="h-9 w-9 rounded-lg bg-white" aria-hidden="true" />
                : tone === 'speaking' ? <SpeakerIcon />
                : tone === 'busy' ? <Icon name="spark" className="h-10 w-10" />
                : <Icon name="mic" className="h-10 w-10" />}
            </button>
          </div>

          <div aria-hidden="true" className="flex h-8 items-center gap-[3px]">
            {BARS.map((h, i) => (
              <span key={i} className={`w-[3px] origin-center rounded-full ${tone === 'listening' ? 'animate-bar bg-red-400' : tone === 'speaking' ? 'animate-bar bg-white' : 'bg-white/25'}`}
                style={{ height: waving ? h + 6 : Math.max(4, h / 2), animationDelay: `${(i % 6) * 0.08}s` }} />
            ))}
          </div>

          <p key={status} role="status" className={`mt-4 animate-word text-xl font-extrabold ${tone === 'busy' ? 'text-amber-300' : tone === 'error' ? 'text-red-300' : ''}`}>{title}</p>
          <p className="mt-1 max-w-xs text-center text-sm text-white/60">{hint}</p>

          {conversation.error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-200">{conversation.error}</p>}
          {status === 'error' && <button type="button" className="mt-3 min-h-[40px] rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10" onClick={() => void conversation.start()}>Thử lại</button>}
          {conversation.notice && <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-center text-sm text-amber-100">{conversation.notice}</p>}
          {active && <button type="button" className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10" onClick={conversation.resumeAudio}><Icon name="play" className="h-3.5 w-3.5" />Tiếp tục âm thanh</button>}
        </section>

        <section className="flex min-h-[320px] flex-1 flex-col md:min-h-0">
          <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="font-bold">Transcript trực tiếp</h3>
              <p className="text-xs text-ink-mute">Chỉ dùng để giữ ngữ cảnh hội thoại, không lưu điểm.</p>
            </div>
            <span className="shrink-0 text-xs text-ink-faint">{transcript.length} lượt</span>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {transcript.length === 0
              ? <div className="grid h-full place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-ink-mute"><Icon name="chat" /></span><p className="mt-3 text-sm text-ink-mute">Chạm mic và nói câu đầu tiên.<br />AI sẽ phản hồi bằng giọng nói.</p></div></div>
              : transcript.map((line) => {
                const at = mmss(stamps[line.id] ?? elapsed);
                return line.role === 'user'
                  ? <div key={line.id} className="ml-auto max-w-[88%] animate-in-sm text-right"><span className={`${KICKER} text-[10px] text-ink-faint`}>Bạn · {at}</span><p className="mt-1 break-words rounded-2xl rounded-br-md bg-ink px-4 py-3 text-left text-sm text-white">{line.text}</p></div>
                  : <div key={line.id} className="flex max-w-[92%] animate-in-sm gap-2.5"><span className="mt-5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white"><Icon name="spark" className="h-3.5 w-3.5" /></span><div className="min-w-0"><span className={`${KICKER} text-[10px] text-ink-faint`}>{voice} · {at}</span><p className="mt-1 break-words rounded-2xl rounded-tl-md bg-surface-muted px-4 py-3 text-sm">{line.text}{line.id === streamingId && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] animate-blink bg-ink align-middle" />}</p></div></div>;
              })}
            <div ref={transcriptEndRef} />
          </div>
        </section>
      </div>

      <footer className="flex items-center gap-3 border-t border-border px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <span className="shrink-0 rounded-full bg-skill-speaking-bg px-2.5 py-1 text-[11px] font-bold text-skill-speaking">AI Voice</span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-mute">Không chấm điểm · Còn {minutesLeft} phút hôm nay</span>
        <button type="button" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={() => void close()}><span className="h-2.5 w-2.5 rounded-sm bg-white" aria-hidden="true" />Kết thúc và đóng</button>
      </footer>
    </div>
  </div>, document.body);
}

function ComingSoon() {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="relative animate-in overflow-hidden rounded-3xl bg-ink px-7 py-10 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 animate-spin-slow rounded-full border border-dashed border-white/10" />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Icon name="spark" /></span>
        <span className="mt-5 inline-flex rounded-full bg-green-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-green-300">Đã ra mắt</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">AI English Lounge</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Luyện phản xạ giao tiếp tiếng Anh tự nhiên với AI bằng giọng nói, chọn giọng nam hoặc nữ và sử dụng tối đa 120 phút mỗi ngày.</p>
        <Link to="/ai-voice/plans" className="btn mt-6 min-h-[48px] rounded-full bg-white px-6 text-ink hover:bg-surface-muted">Xem gói AI Voice<Icon name="arrow" className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
