import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminImportApi } from '@/api/adminEndpoints';
import { assetApi, uploadToPresignedUrl } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, Pager, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { JobStatus } from '@/types/admin';
import type { AssetType } from '@/types/api';

const PAGE_SIZE = 20;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const IMPORT_ASSET_TYPE: AssetType = 'IMPORT_FILE';

/** Job ở các trạng thái này còn chạy nền, danh sách cần tự làm mới. */
const RUNNING_STATUSES: JobStatus[] = ['QUEUED', 'PROCESSING'];

const POLL_INTERVAL_MS = 5_000;

/** Các bước của luồng tải lên, để người dùng biết đang dừng ở đâu khi lỗi. */
type UploadStep = 'idle' | 'requesting' | 'uploading' | 'completing' | 'creating';

const STEP_LABELS: Record<Exclude<UploadStep, 'idle'>, string> = {
  requesting: 'Đang xin đường dẫn tải lên…',
  uploading: 'Đang tải file lên kho lưu trữ…',
  completing: 'Đang xác nhận file đã tải xong…',
  creating: 'Đang tạo job import…',
};

export function ImportAdminPage() {
  const { has } = usePermission();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null,
  );
  const [page, setPage] = useState(0);

  const canWrite = has('question_set:write');

  const listQuery = useQuery({
    queryKey: ['admin', 'import-jobs', page],
    queryFn: () => adminImportApi.list(page, PAGE_SIZE),
    enabled: canWrite,
    placeholderData: (prev) => prev,
    /**
     * Chỉ hỏi lại khi thực sự còn job đang chạy — job đã xong thì trạng thái
     * không đổi nữa, poll tiếp chỉ tốn request.
     */
    refetchInterval: (query) => {
      const jobs = query.state.data?.content;
      if (!jobs) return false;
      return jobs.some((job) => RUNNING_STATUSES.includes(job.status))
        ? POLL_INTERVAL_MS
        : false;
    },
  });

  const upload = useMutation({
    mutationFn: async (selected: File) => {
      setStep('requesting');
      const { assetId, uploadUrl } = await assetApi.createUploadUrl({
        assetType: IMPORT_ASSET_TYPE,
        mimeType: XLSX_MIME,
        filename: selected.name,
        fileSize: selected.size,
      });

      setStep('uploading');
      await uploadToPresignedUrl(uploadUrl, selected, XLSX_MIME);

      setStep('completing');
      await assetApi.complete(assetId);

      setStep('creating');
      return adminImportApi.create(assetId);
    },
    onSuccess: () => {
      setStep('idle');
      setFile(null);
      // Input file là uncontrolled: phải xóa tay để chọn lại đúng file đó được
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBanner({
        tone: 'success',
        message: 'Đã tạo job import. Kết quả sẽ cập nhật trong bảng bên dưới.',
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'import-jobs'] });
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Lỗi không xác định';
      const at = step === 'idle' ? '' : ` (${STEP_LABELS[step]})`;
      setStep('idle');
      setBanner({ tone: 'danger', message: `Tải lên thất bại${at}: ${detail}` });
    },
  });

  if (!canWrite) {
    return (
      <ErrorBlock message="Bạn không có quyền import câu hỏi (question_set:write)." />
    );
  }

  return (
    <div>
      <PageHeader
        title="Import câu hỏi"
        description="Tải file Excel để nạp hàng loạt bộ câu hỏi vào ngân hàng đề."
      />

      {banner && (
        <ResultBanner
          tone={banner.tone}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <section className="card mb-5">
        <h2 className="font-semibold text-slate-900">Tải file lên</h2>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label htmlFor="import-file" className="label">
              File Excel (.xlsx)
            </label>
            <input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="input"
              disabled={upload.isPending}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setBanner(null);
              }}
            />
          </div>

          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={!file || upload.isPending}
            onClick={() => {
              if (file) upload.mutate(file);
            }}
          >
            {upload.isPending ? 'Đang xử lý…' : 'Tải lên và import'}
          </button>
        </div>

        {step !== 'idle' && (
          <p className="mt-3 text-sm text-brand-700">{STEP_LABELS[step]}</p>
        )}

        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Bộ câu hỏi import vào luôn ở trạng thái <strong>Nháp (DRAFT)</strong>. Bạn phải
          tự kiểm tra, gửi duyệt và phát hành thủ công thì học viên mới thấy.
        </p>
      </section>

      <ExcelFormatGuide />

      <h2 className="mb-2 mt-6 font-semibold text-slate-900">Lịch sử import</h2>
      {renderJobTable()}
    </div>
  );

  function renderJobTable() {
    if (listQuery.isPending) {
      return <LoadingBlock label="Đang tải lịch sử import…" />;
    }

    if (listQuery.error || !listQuery.data) {
      return (
        <ErrorBlock
          message={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : 'Không tải được lịch sử import'
          }
          onRetry={() => void listQuery.refetch()}
        />
      );
    }

    const { content: jobs, totalPages } = listQuery.data;
    const onError = (message: string) => setBanner({ tone: 'danger', message });

    return (
      <>
      <DataTable
        headers={[
          'Loại',
          'Trạng thái',
          'Tổng dòng',
          'Thành công',
          'Lỗi',
          'Tạo lúc',
          'Xong lúc',
          '',
        ]}
        isEmpty={jobs.length === 0}
        empty="Chưa có lần import nào."
      >
        {jobs.map((job) => (
          <tr key={job.id}>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
              {job.importType}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">
              <StatusBadge status={job.status} />
              {job.errorMessage && (
                <p className="mt-1 max-w-xs text-xs text-red-700">{job.errorMessage}</p>
              )}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
              {job.totalRows}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-emerald-700">
              {job.successRows}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-red-700">
              {job.failedRows}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
              {formatDateTime(job.queuedAt)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
              {formatDateTime(job.completedAt)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">
              {job.errorReportAssetId && (
                <DownloadAssetButton
                  assetId={job.errorReportAssetId}
                  label="Tải báo lỗi"
                  onError={onError}
                />
              )}
            </td>
          </tr>
        ))}
      </DataTable>

        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      </>
    );
  }
}

/**
 * Signed URL có hạn ngắn nên chỉ xin ngay lúc bấm, không lấy sẵn khi render
 * bảng.
 */
function DownloadAssetButton({
  assetId,
  label,
  onError,
}: {
  assetId: string;
  label: string;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const asset = await assetApi.signedUrl(assetId);
      if (asset.signedUrl) {
        window.open(asset.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        onError('Máy chủ không trả về đường dẫn tải file.');
      }
    } catch (error) {
      onError(
        error instanceof ApiError ? error.message : 'Không lấy được đường dẫn tải file',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-ghost !px-2 !py-1 text-xs"
      disabled={loading}
      onClick={() => void handleClick()}
    >
      {loading ? 'Đang lấy link…' : label}
    </button>
  );
}

function ExcelFormatGuide() {
  return (
    <section className="card">
      <h2 className="font-semibold text-slate-900">Định dạng file Excel</h2>

      <p className="mt-2 text-sm text-slate-600">
        Cột bắt buộc:{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">code</code>,{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">part_code</code>,{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">component_code</code>,{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">prompt</code>.
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Cột <code className="rounded bg-slate-100 px-1 font-mono text-xs">task_type</code>{' '}
        quyết định dạng bài; bỏ trống thì mặc định{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">SINGLE_CHOICE</code>.
      </p>

      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li>
          <strong>SINGLE_CHOICE / GAP_FILL_CHOICE</strong>:{' '}
          <code className="font-mono text-xs">correct_option</code> là một mã phương án (A,
          B, …); phương án đặt ở{' '}
          <code className="font-mono text-xs">option_a</code>…
          <code className="font-mono text-xs">option_h</code>.
        </li>
        <li>
          <strong>MULTIPLE_CHOICE</strong>:{' '}
          <code className="font-mono text-xs">correct_option</code> là nhiều mã cách nhau
          dấu phẩy.
        </li>
        <li>
          <strong>MATCHING / SPEAKER_MATCHING / HEADING_MATCHING</strong>: vế trái ở{' '}
          <code className="font-mono text-xs">left_a</code>…
          <code className="font-mono text-xs">left_h</code>, vế phải ở{' '}
          <code className="font-mono text-xs">option_a</code>…
          <code className="font-mono text-xs">option_h</code>, đáp án ở{' '}
          <code className="font-mono text-xs">correct_matches</code> dạng{' '}
          <code className="font-mono text-xs">A=B, C=D</code>.
        </li>
        <li>
          <strong>SENTENCE_ORDERING</strong>:{' '}
          <code className="font-mono text-xs">correct_order</code> dạng{' '}
          <code className="font-mono text-xs">C,A,B</code> — phải liệt kê đủ mọi phương án.
        </li>
        <li>
          <strong>SHORT_TEXT</strong>:{' '}
          <code className="font-mono text-xs">accepted_answers</code> liệt kê các đáp án
          chấp nhận, cách nhau bằng dấu{' '}
          <code className="font-mono text-xs">|</code> (không dùng dấu phẩy vì đáp án có
          thể chứa dấu phẩy như <code className="font-mono text-xs">1,000</code>); cờ{' '}
          <code className="font-mono text-xs">case_sensitive</code> bật/tắt phân biệt hoa
          thường.
        </li>
      </ul>

      <p className="mt-3 text-sm text-slate-600">
        Cột tùy chọn khác: <code className="font-mono text-xs">title</code>,{' '}
        <code className="font-mono text-xs">difficulty</code> (1..5),{' '}
        <code className="font-mono text-xs">access_level</code> (FREE/PREMIUM),{' '}
        <code className="font-mono text-xs">instructions</code>,{' '}
        <code className="font-mono text-xs">explanation</code>,{' '}
        <code className="font-mono text-xs">topic_code</code>,{' '}
        <code className="font-mono text-xs">partial_credit</code>.
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Nhiều dòng cùng <code className="font-mono text-xs">code</code> sẽ gộp thành một bộ
        nhiều câu; các dòng cùng code phải có cùng{' '}
        <code className="font-mono text-xs">task_type</code>.
      </p>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Dạng tự luận (<code className="font-mono text-xs">LONG_TEXT</code>,{' '}
        <code className="font-mono text-xs">AUDIO_RECORDING</code>) không import được vì
        chấm bằng rubric — phải soạn qua trang quản trị.
      </p>
    </section>
  );
}
