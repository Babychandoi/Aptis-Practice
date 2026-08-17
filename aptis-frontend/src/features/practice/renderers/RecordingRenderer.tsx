import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { assetApi, uploadToPresignedUrl } from '@/api/endpoints';
import { formatDuration } from '@/lib/format';
import type { QuestionItem } from '@/types/api';
import type { ResponseDraft } from '@/features/practice/responseState';

interface Props {
  item: QuestionItem;
  attemptId: string;
  questionSetId: string;
  draft: ResponseDraft;
  disabled: boolean;
  /**
   * Chế độ thi thật (Speaking trong bài đủ 5 kỹ năng): tự chạy từ đầu đến cuối —
   * vào câu là tự đếm giờ chuẩn bị rồi tự ghi âm, hết giờ tự dừng, chỉ ghi một
   * lần, không nghe lại. Học viên không phải bấm gì.
   */
  examMode?: boolean;
  /** Ghi âm xong ở chế độ thi: cha dùng để tự chuyển sang câu tiếp. */
  onExamFinished?: () => void;
  onChange: (draft: ResponseDraft) => void;
}

type Phase = 'idle' | 'prep' | 'recording' | 'uploading' | 'done' | 'error';

const MIME_TYPE = 'audio/webm';

/**
 * Chiều cao (%) các vạch sóng âm. Cố định thay vì phân tích tín hiệu thật:
 * chỉ cần báo cho học viên biết đang ghi, không cần đo biên độ.
 */
const WAVE_BARS = [
  35, 60, 45, 80, 55, 30, 70, 50, 85, 40, 65, 45, 75, 35, 55, 90, 45, 60, 30, 70,
  50, 40, 80, 55, 35, 65, 45, 75, 60, 40,
];

/**
 * Ghi âm Speaking rồi upload trực tiếp lên MinIO bằng presigned URL.
 * Backend chỉ nhận asset_id, không proxy file (§28).
 */
export function RecordingRenderer({
  item,
  attemptId,
  questionSetId,
  draft,
  disabled,
  examMode = false,
  onExamFinished,
  onChange,
}: Props) {
  const prepSeconds = numberConstraint(item, 'prepSeconds') ?? 0;
  const responseSeconds = numberConstraint(item, 'responseSeconds') ?? 60;
  const maxRecordings = examMode ? 1 : numberConstraint(item, 'maxRecordings') ?? 1;

  const [phase, setPhase] = useState<Phase>(draft.recordingAssetId ? 'done' : 'idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptCount, setAttemptCount] = useState(draft.recordingAssetId ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Dừng stream và timer khi rời trang để không giữ microphone
  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    },
    [playbackUrl],
  );

  const countdown = (seconds: number, onFinish: () => void) => {
    setSecondsLeft(seconds);
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void handleRecordingStopped();
      };

      recorder.start();
      setPhase('recording');
      countdown(responseSeconds, () => stopRecording());

    } catch {
      setPhase('error');
      setError('Không truy cập được microphone. Kiểm tra quyền của trình duyệt.');
    }
  };

  const beginPrep = () => {
    if (prepSeconds === 0) {
      void startRecording();
      return;
    }
    setPhase('prep');
    countdown(prepSeconds, () => void startRecording());
  };

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  /**
   * Chế độ thi: câu vừa hiện ra là chạy luôn, không chờ bấm nút.
   *
   * Chỉ chạy một lần cho mỗi câu (khoá bằng startedRef) và bỏ qua câu đã có bản
   * ghi — quay lại câu cũ không được ghi đè.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (!examMode || disabled || startedRef.current) return;
    if (draft.recordingAssetId) return;
    startedRef.current = true;
    beginPrep();
    // beginPrep đọc prepSeconds/responseSeconds của chính câu này; item không đổi
    // trong vòng đời component nên không cần thêm dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examMode, disabled, draft.recordingAssetId]);

  const handleRecordingStopped = async () => {
    const blob = new Blob(chunksRef.current, { type: MIME_TYPE });
    setPhase('uploading');

    try {
      const { assetId, uploadUrl } = await assetApi.createUploadUrl({
        assetType: 'USER_RECORDING',
        mimeType: MIME_TYPE,
        fileSize: blob.size,
        attemptId,
        questionSetId,
      });

      await uploadToPresignedUrl(uploadUrl, blob, MIME_TYPE);
      // Backend xác minh file trên storage rồi chuyển asset sang READY
      await assetApi.complete(assetId, { durationMs: responseSeconds * 1000 });

      setPlaybackUrl(URL.createObjectURL(blob));
      setAttemptCount((count) => count + 1);
      setPhase('done');
      onChange({ recordingAssetId: assetId });

      // Chế độ thi: nghỉ một nhịp cho học viên thấy "đã lưu" rồi tự sang câu sau.
      if (examMode) window.setTimeout(() => onExamFinished?.(), 1200);

    } catch {
      setPhase('error');
      setError('Không tải được file ghi âm lên. Thử ghi lại.');
    }
  };

  const canRecordAgain = !examMode && attemptCount < maxRecordings;

  /** Giây đã ghi, để hiện dạng "đã ghi / tổng" giống máy ghi âm. */
  const elapsed = phase === 'recording' ? responseSeconds - secondsLeft : 0;

  return (
    <div className="rounded-xl border border-[#e5dcc8] bg-[#fdf6e3]/60 p-3">
      {(phase === 'idle' || phase === 'recording' || phase === 'prep') && (
        <>
          <div className="flex items-center gap-3">
            {/* Chế độ thi không có nút bấm: máy tự chạy, chỉ báo đang ở nhịp nào. */}
            {examMode ? (
              <span className={clsx(
                'inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold',
                phase === 'recording' ? 'bg-red-600 text-white' : 'bg-[#eaf4ef] text-brand-900',
              )}>
                {phase === 'recording' ? (
                  <>
                    <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-sm bg-white" />
                    Đang ghi · còn {secondsLeft}s
                  </>
                ) : phase === 'prep' ? (
                  <>⏳ Chuẩn bị · {secondsLeft}s</>
                ) : (
                  <>🎤 Sắp bắt đầu…</>
                )}
              </span>
            ) : phase === 'recording' ? (
              <button type="button" onClick={stopRecording} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-sm bg-white" />
                Dừng và lưu
              </button>
            ) : (
              <button type="button" onClick={beginPrep} disabled={disabled || phase === 'prep'} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50">
                🎤 {phase === 'prep' ? `Chuẩn bị ${secondsLeft}s` : 'Bắt đầu ghi âm'}
              </button>
            )}

            {/* Thanh sóng âm: chỉ để báo trạng thái, không phân tích tín hiệu thật */}
            <div className="flex h-11 flex-1 items-center gap-[3px] overflow-hidden rounded-lg border border-[#e2d9c4] bg-white px-3">
              {WAVE_BARS.map((height, index) => (
                <span
                  key={index}
                  className={clsx(
                    'w-[3px] rounded-full transition-colors',
                    phase === 'recording' ? 'animate-pulse bg-brand-700' : 'bg-stone-300',
                  )}
                  style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                />
              ))}
            </div>

            <span className="shrink-0 rounded-lg border border-[#e2d9c4] bg-white px-3 py-2 text-[11px] font-medium tabular-nums text-stone-600">
              <span className={phase === 'recording' ? 'text-red-600' : undefined}>●</span>{' '}
              {formatDuration(elapsed)} <span className="text-stone-400">/ {formatDuration(responseSeconds)}</span>
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md border border-[#e2d9c4] bg-white px-2 py-1 text-[10px] text-stone-500">
              Đã nói: {draft.recordingAssetId ? '—' : 0} từ
            </span>
            {maxRecordings > 1 && (
              <span className="text-[10px] text-stone-500">Được ghi {maxRecordings} lần</span>
            )}
          </div>
        </>
      )}

      {phase === 'uploading' && (
        <p className="text-center text-sm text-slate-600">Đang tải file lên…</p>
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-700">✓ Đã lưu bản ghi âm</p>
          {/* Đề thật không cho nghe lại — nghe lại chỉ có ở chế độ luyện tập. */}
          {playbackUrl && !examMode && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={playbackUrl} className="w-full" />
          )}
          {canRecordAgain && !disabled && (
            <button
              type="button"
              onClick={() => {
                setPhase('idle');
                setPlaybackUrl(null);
              }}
              className="btn-secondary w-full"
            >
              Ghi lại ({maxRecordings - attemptCount} lần còn lại)
            </button>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              setPhase('idle');
              setError(null);
            }}
            className="btn-secondary mt-3"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}

function numberConstraint(item: QuestionItem, key: string): number | null {
  const value = item.constraints[key];
  return typeof value === 'number' ? value : null;
}
