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
  // URL của blob vừa ghi, chỉ sống trong phiên này.
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  // Link tải từ server, để mở lại bài cũ vẫn nghe được — và để giáo viên nghe
  // bài của học viên mà chấm. Tách riêng vì không được revokeObjectURL cái này.
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);

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

  // Draft nạp bất đồng bộ nên lúc mount thường chưa có gì; state khởi tạo ở trên
  // sẽ kẹt ở 'idle' và hiện nút ghi âm đè lên bài cũ. Bắt kịp khi draft về.
  useEffect(() => {
    if (draft.recordingAssetId) {
      setPhase((truoc) => (truoc === 'idle' ? 'done' : truoc));
      setAttemptCount((truoc) => (truoc === 0 ? 1 : truoc));
    }
  }, [draft.recordingAssetId]);

  // Bài đã ghi từ trước: xin link nghe từ server. Không có bước này thì mở lại
  // bài cũ chỉ thấy "đã ghi" mà không nghe được gì.
  useEffect(() => {
    const assetId = draft.recordingAssetId;
    if (!assetId || playbackUrl) {
      return;
    }

    let huy = false;
    setLoadingSaved(true);
    assetApi
      .signedUrl(assetId)
      .then((asset) => {
        if (!huy) setSavedUrl(asset.signedUrl ?? null);
      })
      .catch(() => {
        if (!huy) setSavedUrl(null);
      })
      .finally(() => {
        if (!huy) setLoadingSaved(false);
      });

    return () => {
      huy = true;
    };
  }, [draft.recordingAssetId, playbackUrl]);

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

  /** Số giây hiện giữa vòng tròn và tỉ lệ vòng còn lại. */
  const ringSeconds = phase === 'recording' || phase === 'prep' ? secondsLeft : responseSeconds;
  const ringTotal = phase === 'prep' ? prepSeconds : responseSeconds;
  const ringRatio = phase === 'idle' || ringTotal <= 0 ? 1 : Math.max(0, Math.min(1, secondsLeft / ringTotal));

  return (
    <div className="py-2">
      {/* Bài chỉ đọc mà chưa ghi gì: nói rõ em bỏ trống, chứ hiện nút ghi âm thì
          giáo viên bấm nhầm là ghi đè vào bài của học viên. */}
      {disabled && phase === 'idle' && (
        <p className="text-sm text-amber-700">Em chưa ghi âm câu này</p>
      )}

      {!disabled && (phase === 'idle' || phase === 'recording' || phase === 'prep') && (
        <div className="flex flex-col items-center gap-3 py-2">
          {/* Vòng đếm ngược lớn có micro ở giữa. Chế độ thi không bấm được: máy tự chạy. */}
          <button
            type="button"
            onClick={phase === 'recording' ? stopRecording : beginPrep}
            disabled={examMode || phase === 'prep'}
            aria-label={phase === 'recording' ? 'Dừng và lưu' : 'Bắt đầu ghi âm'}
            className="relative grid h-44 w-44 place-items-center rounded-full disabled:cursor-default sm:h-[210px] sm:w-[210px]"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#E2E8F0" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={phase === 'recording' ? '#DC2626' : phase === 'prep' ? '#F59E0B' : '#0F172A'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - ringRatio)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className={clsx(
              'relative grid h-[82%] w-[82%] place-items-center rounded-full text-white',
              phase === 'recording' ? 'bg-red-600' : 'bg-ink',
            )}>
              {/* Sóng toả ra theo mock: đỏ dồn dập khi đang ghi, xám nhẹ khi chờ bấm. */}
              {phase === 'recording' && (
                <>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400 [animation:micping_1.6s_ease-out_infinite]" />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400 [animation:micping_1.6s_ease-out_.8s_infinite]" />
                </>
              )}
              {phase === 'idle' && !examMode && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-ink/30 [animation:micping_2.4s_ease-out_infinite]" />
              )}
              <span className="relative flex flex-col items-center">
                <MicGlyph />
                <span className="mt-1 font-mono text-3xl font-bold tabular-nums sm:text-[34px]">{formatDuration(ringSeconds)}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-white/70">
                  {phase === 'recording' ? 'Đang ghi' : phase === 'prep' ? 'Chuẩn bị' : examMode ? 'Sắp bắt đầu' : 'Sẵn sàng'}
                </span>
              </span>
            </span>
          </button>

          {/* Thanh sóng âm: chỉ để báo trạng thái, không phân tích tín hiệu thật */}
          <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
            {WAVE_BARS.slice(0, 22).map((height, index) => (
              <span
                key={index}
                className={clsx(
                  'w-[3px] rounded-full transition-colors',
                  phase === 'recording' ? 'bg-red-500' : 'bg-brand-300',
                )}
                style={{
                  height: `${height}%`,
                  animation: phase === 'recording' ? `wavebar .${4 + (index % 5)}s ease-in-out ${(index * 0.04).toFixed(2)}s infinite alternate` : undefined,
                }}
              />
            ))}
          </div>

          <p className="text-center text-sm text-ink-soft">
            {phase === 'recording'
              ? `Đang ghi ${formatDuration(elapsed)} / ${formatDuration(responseSeconds)}${examMode ? '' : ' — bấm vòng tròn để dừng và lưu'}`
              : phase === 'prep'
                ? `Chuẩn bị — máy tự ghi âm sau ${secondsLeft} giây`
                : examMode
                  ? 'Máy sẽ tự bắt đầu ghi âm'
                  : `Bấm để bắt đầu nói — bạn có ${responseSeconds} giây`}
          </p>
          {maxRecordings > 1 && (
            <span className="text-[11px] text-ink-mute">Được ghi {maxRecordings} lần</span>
          )}
        </div>
      )}

      {phase === 'uploading' && (
        <p className="text-center text-sm text-slate-600">Đang tải file lên…</p>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Cùng vòng tròn với lúc ghi để màn không nhảy sang kiểu cũ sau khi ghi xong. */}
          <span className="grid h-[168px] w-[168px] place-items-center rounded-full border-[10px] border-skill-speaking-bg bg-skill-speaking text-white">
            <span className="flex flex-col items-center gap-1">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Đã lưu</span>
            </span>
          </span>
          <p className="text-sm font-medium text-ink-soft">Đã lưu bản ghi âm</p>

          {/* Đang thi thì không cho nghe lại, giống phòng thi thật. Nhưng khi
              xem lại bài đã nộp (disabled/showAnswer) thì phải nghe được —
              giáo viên chấm Speaking mà không nghe được thì chấm bằng gì. */}
          {(!examMode || disabled) && (
            <>
              {playbackUrl ? (
                <audio controls src={playbackUrl} className="w-full max-w-sm" />
              ) : loadingSaved ? (
                <p className="text-xs text-slate-500">Đang tải bản ghi…</p>
              ) : savedUrl ? (
                <audio controls src={savedUrl} className="w-full max-w-sm" />
              ) : (
                <p className="text-xs text-amber-700">
                  Không tải được bản ghi. Thử tải lại trang.
                </p>
              )}
            </>
          )}
          {canRecordAgain && !disabled && (
            <button
              type="button"
              onClick={() => {
                setPhase('idle');
                setPlaybackUrl(null);
              }}
              className="btn-secondary"
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

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </svg>
  );
}

function numberConstraint(item: QuestionItem, key: string): number | null {
  const value = item.constraints[key];
  return typeof value === 'number' ? value : null;
}
