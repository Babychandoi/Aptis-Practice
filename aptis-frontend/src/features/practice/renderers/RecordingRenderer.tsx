import { useEffect, useRef, useState } from 'react';
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
  onChange: (draft: ResponseDraft) => void;
}

type Phase = 'idle' | 'prep' | 'recording' | 'uploading' | 'done' | 'error';

const MIME_TYPE = 'audio/webm';

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
  onChange,
}: Props) {
  const prepSeconds = numberConstraint(item, 'prepSeconds') ?? 0;
  const responseSeconds = numberConstraint(item, 'responseSeconds') ?? 60;
  const maxRecordings = numberConstraint(item, 'maxRecordings') ?? 1;

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

    } catch {
      setPhase('error');
      setError('Không tải được file ghi âm lên. Thử ghi lại.');
    }
  };

  const canRecordAgain = attemptCount < maxRecordings;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      {phase === 'idle' && (
        <div className="text-center">
          <p className="mb-3 text-sm text-slate-600">
            {prepSeconds > 0 && `Chuẩn bị ${prepSeconds}s · `}
            Nói trong {responseSeconds}s
            {maxRecordings > 1 && ` · Được ghi ${maxRecordings} lần`}
          </p>
          <button type="button" onClick={beginPrep} disabled={disabled} className="btn-primary">
            🎤 Bắt đầu ghi âm
          </button>
        </div>
      )}

      {phase === 'prep' && (
        <div className="text-center">
          <p className="text-sm text-slate-600">Chuẩn bị…</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-600">
            {secondsLeft}
          </p>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-red-600">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            Đang ghi âm
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {formatDuration(secondsLeft)}
          </p>
          <button type="button" onClick={stopRecording} className="btn-secondary mt-3">
            Dừng và lưu
          </button>
        </div>
      )}

      {phase === 'uploading' && (
        <p className="text-center text-sm text-slate-600">Đang tải file lên…</p>
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-700">✓ Đã lưu bản ghi âm</p>
          {playbackUrl && (
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
