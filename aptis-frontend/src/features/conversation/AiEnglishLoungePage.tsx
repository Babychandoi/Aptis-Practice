import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { aiConversationApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useGeminiLiveConversation } from './useGeminiLiveConversation';
import { useEscapeKey } from '@/lib/useEscapeKey';

export function AiEnglishLoungePage() {
  const access = useQuery({ queryKey: ['ai-conversation', 'access'], queryFn: aiConversationApi.access });
  if (access.isPending) return <LoadingBlock label="Đang kiểm tra quyền AI Voice…" />;
  if (!access.data?.allowed) return <ComingSoon />;
  return <VoiceLounge configured={access.data.configured} dailyLimitSeconds={access.data.dailyLimitSeconds} dailyRemainingSeconds={access.data.dailyRemainingSeconds} onUsageChanged={() => void access.refetch()} />;
}

function VoiceLounge({ configured, dailyLimitSeconds, dailyRemainingSeconds, onUsageChanged }: { configured: boolean; dailyLimitSeconds: number; dailyRemainingSeconds: number; onUsageChanged: () => void }) {
  const [topic, setTopic] = useState('Daily life');
  const [level, setLevel] = useState('B1');
  const [voice, setVoice] = useState('Aoede');
  const [freshStart, setFreshStart] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 px-7 py-9 text-white shadow-lg"><span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">AI Voice Premium</span><h1 className="mt-4 text-3xl font-bold">AI English Lounge</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100">Trò chuyện tiếng Anh bằng giọng nói với AI để luyện phản xạ thoải mái, không chấm điểm và không mô phỏng bài thi.</p></header>
    <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      {!configured && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Hệ thống Gemini Live chưa sẵn sàng. Vui lòng báo quản trị viên.</p>}
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Chủ đề<input className="input mt-1" maxLength={100} value={topic} onChange={(e) => setTopic(e.target.value)} /></label><label className="text-sm font-medium">Trình độ<select className="input mt-1" value={level} onChange={(e) => setLevel(e.target.value)}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label><label className="text-sm font-medium">Giọng AI<select className="input mt-1" value={voice} onChange={(e) => setVoice(e.target.value)}><option value="Aoede">Nữ · Aoede</option><option value="Puck">Nam · Puck</option></select></label></div>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900"><span>Thời lượng AI Voice hôm nay</span><strong>Còn {Math.ceil(dailyRemainingSeconds / 60)} / {Math.round(dailyLimitSeconds / 60)} phút</strong></div>
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" className="mt-1" checked={freshStart} onChange={(event) => setFreshStart(event.target.checked)} /><span>Bắt đầu cuộc trò chuyện mới, không mang theo ngữ cảnh trước.<span className="block text-xs text-slate-500">Mặc định AI tiếp tục nhớ cuộc trò chuyện gần nhất. Lịch sử đã lưu không bị xóa.</span></span></label>
      <button type="button" className="btn-primary mt-3 w-full !py-3" disabled={!configured || dailyRemainingSeconds <= 0} onClick={() => setStudioOpen(true)}>🎙️ Mở phòng thu và trò chuyện</button>
    </section>
    {studioOpen && <VoiceStudioModal topic={topic} level={level} voice={voice} freshStart={freshStart} onClose={() => { setStudioOpen(false); onUsageChanged(); }} />}
  </div>;
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
      <header className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">AI English Lounge</p><h2 className="mt-1 text-xl font-bold">Phòng thu hội thoại</h2></div><button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20" onClick={() => void close()} aria-label="Đóng phòng thu">×</button></header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col items-center justify-center border-b border-white/10 bg-gradient-to-b from-violet-950/70 to-slate-950 p-6 md:border-b-0 md:border-r">
          <p className="text-sm text-violet-200">{topic} · {level} · {voice === 'Puck' ? 'Giọng nam' : 'Giọng nữ'}</p>
          <div className="relative my-8 grid h-52 w-52 place-items-center">
            {active && <><span className="absolute inset-0 animate-ping rounded-full bg-violet-500/15" /><span className="absolute inset-5 animate-pulse rounded-full bg-fuchsia-500/20" /></>}
            <button type="button" disabled={conversation.status === 'connecting' || conversation.status === 'handoff'} onClick={() => active ? void conversation.stop() : void conversation.start()} className={`relative grid h-36 w-36 place-items-center rounded-full border-4 shadow-[0_0_60px_rgba(139,92,246,0.45)] transition ${active ? 'border-fuchsia-300 bg-gradient-to-br from-violet-600 to-fuchsia-600' : 'border-white/20 bg-white/10 hover:scale-105 hover:bg-white/15'}`} aria-label={active ? 'Dừng trò chuyện' : 'Bắt đầu trò chuyện'}><span className="text-6xl" aria-hidden="true">🎙️</span></button>
          </div>
          <p className="text-lg font-semibold">{statusLabel(conversation.status)}</p>
          <p className="mt-2 text-center text-sm text-slate-400">{active ? 'Mic tạm nghỉ khi AI đang nói và tự mở lại khi AI nói xong.' : 'Chạm mic để cấp quyền micro và bắt đầu.'}</p>
          {conversation.notice && <p role="status" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-center text-sm text-amber-100">{conversation.notice}</p>}
          {active && <button type="button" className="mt-3 text-xs text-violet-200 underline" onClick={conversation.resumeAudio}>Tiếp tục âm thanh</button>}
          {conversation.secondsLeft > 0 && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Còn khoảng {Math.ceil(conversation.secondsLeft / 60)} phút</p>}
          {conversation.error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-200">{conversation.error}</p>}
        </section>
        <section className="flex min-h-0 flex-col bg-slate-900"><div className="border-b border-white/10 px-5 py-4"><h3 className="font-semibold">Transcript trực tiếp</h3><p className="text-xs text-slate-400">Hội thoại chỉ dùng để duy trì ngữ cảnh học tập.</p></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">{conversation.transcript.length === 0 ? <div className="grid h-full place-items-center text-center text-sm text-slate-500">Bấm vào mic và nói câu đầu tiên.<br />AI sẽ phản hồi bằng giọng nói.</div> : conversation.transcript.map((line, index) => <div key={`${line.role}-${index}`} className={line.role === 'user' ? 'ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm text-white' : 'max-w-[88%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-100'}><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider opacity-60">{line.role === 'user' ? 'Bạn' : 'AI Friend'}</span>{line.text}</div>)}<div ref={transcriptEndRef} /></div></section>
      </div>
      <footer className="flex items-center justify-between border-t border-white/10 bg-slate-950 px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3"><span className="text-xs text-slate-500">AI Voice · Không chấm điểm</span><button type="button" className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25" onClick={() => void close()}>Kết thúc và đóng</button></footer>
    </div>
  </div>, document.body);
}

function ComingSoon() { return <div className="mx-auto max-w-4xl"><section className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 px-7 py-10 text-white shadow-lg"><span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">Đã ra mắt</span><h1 className="mt-5 text-3xl font-bold">AI English Lounge</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-violet-100">Luyện phản xạ giao tiếp tiếng Anh tự nhiên với AI bằng giọng nói, chọn giọng nam hoặc nữ và sử dụng tối đa 120 phút mỗi ngày.</p><Link to="/ai-voice/plans" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-violet-50">Xem gói AI Voice</Link></section></div>; }
function statusLabel(status: string) { return ({ idle: 'Sẵn sàng', connecting: 'Đang kết nối', reconnecting: 'Đang khôi phục hội thoại', listening: 'Đang nghe', speaking: 'AI đang nói', handoff: 'Đang chuyển phiên', error: 'Có lỗi' } as Record<string, string>)[status] ?? status; }
