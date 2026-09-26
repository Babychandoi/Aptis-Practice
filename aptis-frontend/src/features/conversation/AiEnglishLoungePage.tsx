import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { aiConversationApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useGeminiLiveConversation } from './useGeminiLiveConversation';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { Icon } from '@/components/shell/icons';

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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section className="relative flex animate-in flex-col gap-5 overflow-hidden rounded-3xl bg-ink p-6 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 animate-spin-slow rounded-full border border-dashed border-white/10" />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Icon name="spark" /></span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">AI English Lounge</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Luyện phản xạ giao tiếp bằng giọng nói với AI. Không chấm điểm, không mô phỏng bài thi. Tối đa {limitMin} phút mỗi ngày.
          </p>
        </div>

        {!configured && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-100">Hệ thống Gemini Live chưa sẵn sàng. Vui lòng báo quản trị viên.</p>}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Giọng AI</p>
          <div role="radiogroup" aria-label="Giọng AI" className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
            {VOICES.map((v) => (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={voice === v.value}
                onClick={() => setVoice(v.value)}
                className={voice === v.value ? 'min-h-[40px] rounded-full bg-white text-sm font-semibold text-ink' : 'min-h-[40px] rounded-full text-sm font-semibold text-white/70 hover:text-white'}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor="lounge-level" className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Trình độ</span>
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
            <span className="block h-full origin-left animate-grow-x rounded-full bg-accent" style={{ width: `${limitMin ? (usedMin / limitMin) * 100 : 0}%` }} />
          </span>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-white/80">
          <input type="checkbox" className="mt-1" checked={freshStart} onChange={(event) => setFreshStart(event.target.checked)} />
          <span>
            Bắt đầu cuộc trò chuyện mới
            <span className="block text-xs text-white/50">Mặc định AI nhớ cuộc trò chuyện gần nhất. Lịch sử đã lưu không bị xoá.</span>
          </span>
        </label>

        <button
          type="button"
          className="btn min-h-[52px] bg-white text-ink hover:bg-surface-muted"
          disabled={!configured || dailyRemainingSeconds <= 0}
          onClick={() => setStudioOpen(true)}
        >
          <Icon name="mic" className="h-4 w-4" />
          {dailyRemainingSeconds <= 0 ? 'Đã hết phút hôm nay' : 'Bắt đầu gọi thoại'}
        </button>
      </section>

      <section className="flex animate-in flex-col gap-3 rounded-3xl border border-border bg-white p-5 [animation-delay:80ms] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Chủ đề gợi ý</p>
        <ul className="flex flex-col gap-2">
          {TOPICS.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => setTopic(t)}
                aria-pressed={topic === t}
                className={topic === t
                  ? 'flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-ink bg-surface-muted px-4 text-left text-sm font-semibold'
                  : 'flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-border px-4 text-left text-sm font-medium hover:border-brand-300'}
              >
                {t}
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <label htmlFor="lounge-topic" className="mt-2 block">
          <span className="label">Hoặc chủ đề của bạn</span>
          <input
            id="lounge-topic"
            className="input"
            maxLength={100}
            placeholder="Ví dụ: kể về chuyến du lịch gần nhất"
            value={custom ? topic : ''}
            onChange={(e) => setTopic(e.target.value || 'Trò chuyện tự do')}
          />
        </label>
        <p className="mt-auto rounded-2xl bg-surface-paper px-4 py-3 text-sm text-ink-mute">
          Đang chọn: <strong className="text-ink">{topic}</strong> · {level} · {voice === 'Puck' ? 'Giọng nam' : 'Giọng nữ'}
        </p>
      </section>

      {studioOpen && <VoiceStudioModal topic={topic} level={level} voice={voice} freshStart={freshStart} onClose={() => { setStudioOpen(false); onUsageChanged(); }} />}
    </div>
  );
}

function VoiceStudioModal({ topic, level, voice, freshStart, onClose }: { topic: string; level: string; voice: string; freshStart: boolean; onClose: () => void }) {
  const conversation = useGeminiLiveConversation(topic, level, voice, freshStart);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const active = conversation.status !== 'idle' && conversation.status !== 'error';
  const close = () => { void conversation.stop(); onClose(); };
  useEscapeKey(() => { void close(); });
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation.transcript]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, []);

  return createPortal(<div className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen items-center justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:p-3" role="dialog" aria-modal="true" aria-label="Phòng thu AI English Lounge">
    <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden border-white/10 bg-slate-950 text-white shadow-2xl sm:h-[min(900px,96dvh)] sm:rounded-3xl sm:border">
      <header className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">AI English Lounge</p><h2 className="mt-1 text-xl font-bold">Phòng thu hội thoại</h2></div><button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20" onClick={() => void close()} aria-label="Đóng phòng thu">×</button></header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col items-center justify-center border-b border-white/10 bg-ink p-6 md:border-b-0 md:border-r">
          <p className="text-sm text-white/70">{topic} · {level} · {voice === 'Puck' ? 'Giọng nam' : 'Giọng nữ'}</p>
          <div className="relative my-8 grid h-52 w-52 place-items-center">
            {active && <><span className="absolute inset-0 animate-ping-mic rounded-full bg-white/10 [animation-duration:2s]" /><span className="absolute inset-5 animate-pulse rounded-full bg-accent/20" /></>}
            <button type="button" disabled={conversation.status === 'connecting' || conversation.status === 'handoff'} onClick={() => active ? void conversation.stop() : void conversation.start()} className={`relative grid h-36 w-36 place-items-center rounded-full border-4 shadow-[0_0_60px_rgba(255,255,255,0.12)] transition ${active ? 'border-accent bg-white/15' : 'border-white/20 bg-white/10 hover:scale-105 hover:bg-white/15'}`} aria-label={active ? 'Dừng trò chuyện' : 'Bắt đầu trò chuyện'}><span className="text-6xl" aria-hidden="true">🎙️</span></button>
          </div>
          <p key={conversation.status} className="flex animate-word items-center gap-2 text-lg font-semibold">
            {statusLabel(conversation.status)}
            {/* Ba chấm nhấp nháy khi đang chờ kết nối, như bong bóng "đang gõ" của mock */}
            {(conversation.status === 'connecting' || conversation.status === 'reconnecting' || conversation.status === 'handoff') && (
              <span aria-hidden="true" className="flex gap-1">
                {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-dot rounded-full bg-white/70" style={{ animationDelay: `${d * 0.15}s` }} />)}
              </span>
            )}
          </p>
          <p className="mt-2 text-center text-sm text-slate-400">{active ? 'Mic tạm nghỉ khi AI đang nói và tự mở lại khi AI nói xong.' : 'Chạm mic để cấp quyền micro và bắt đầu.'}</p>
          {conversation.notice && <p role="status" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-center text-sm text-amber-100">{conversation.notice}</p>}
          {active && <button type="button" className="mt-3 text-xs text-white/70 underline" onClick={conversation.resumeAudio}>Tiếp tục âm thanh</button>}
          {conversation.secondsLeft > 0 && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Còn khoảng {Math.ceil(conversation.secondsLeft / 60)} phút</p>}
          {conversation.error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-200">{conversation.error}</p>}
        </section>
        <section className="flex min-h-0 flex-col bg-[#111a2e]"><div className="border-b border-white/10 px-5 py-4"><h3 className="font-semibold">Transcript trực tiếp</h3><p className="text-xs text-slate-400">Hội thoại chỉ dùng để duy trì ngữ cảnh học tập.</p></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">{conversation.transcript.length === 0 ? <div className="grid h-full place-items-center text-center text-sm text-slate-500">Bấm vào mic và nói câu đầu tiên.<br />AI sẽ phản hồi bằng giọng nói.</div> : conversation.transcript.map((line, index) => <div key={`${line.role}-${index}`} className={line.role === 'user' ? 'ml-auto max-w-[88%] animate-in-sm rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm text-ink' : 'max-w-[88%] animate-in-sm rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-100'}><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider opacity-60">{line.role === 'user' ? 'Bạn' : 'AI Friend'}</span>{line.text}</div>)}<div ref={transcriptEndRef} /></div></section>
      </div>
      <footer className="flex items-center justify-between border-t border-white/10 bg-slate-950 px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3"><span className="text-xs text-slate-500">AI Voice · Không chấm điểm</span><button type="button" className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25" onClick={() => void close()}>Kết thúc và đóng</button></footer>
    </div>
  </div>, document.body);
}

function ComingSoon() { return <div className="mx-auto max-w-4xl"><section className="rounded-3xl bg-ink px-7 py-10 text-white shadow-lg"><span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">Đã ra mắt</span><h1 className="mt-5 text-3xl font-bold">AI English Lounge</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Luyện phản xạ giao tiếp tiếng Anh tự nhiên với AI bằng giọng nói, chọn giọng nam hoặc nữ và sử dụng tối đa 120 phút mỗi ngày.</p><Link to="/ai-voice/plans" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-surface-muted">Xem gói AI Voice</Link></section></div>; }
function statusLabel(status: string) { return ({ idle: 'Sẵn sàng', connecting: 'Đang kết nối', reconnecting: 'Đang khôi phục hội thoại', listening: 'Đang nghe', speaking: 'AI đang nói', handoff: 'Đang chuyển phiên', error: 'Có lỗi' } as Record<string, string>)[status] ?? status; }
