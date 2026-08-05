import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminExportApi } from '@/api/adminEndpoints';
import { assetApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, Pager, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { ExportJob, ExportType, JobStatus } from '@/types/admin';

const PAGE_SIZE = 20;

const POLL_INTERVAL_MS = 5_000;

/** Job ở các trạng thái này còn chạy nền, danh sách cần tự làm mới. */
const RUNNING_STATUSES: JobStatus[] = ['QUEUED', 'PROCESSING'];

const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: 'LEARNING_REPORT', label: 'Báo cáo học tập' },
  { value: 'REVENUE_REPORT', label: 'Báo cáo doanh thu' },
  { value: 'ATTEMPT_DETAIL', label: 'Chi tiết lượt làm bài' },
  { value: 'USER_LIST', label: 'Danh sách người dùng' },
];

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  LEARNING_REPORT: 'Báo cáo học tập',
  REVENUE_REPORT: 'Báo cáo doanh thu',
  ATTEMPT_DETAIL: 'Chi tiết lượt làm bài',
  USER_LIST: 'Danh sách người dùng',
};

/** File quá hạn đã bị xóa khỏi storage — không xin signed URL nữa. */
function isExpired(job: ExportJob): boolean {
  return job.expiresAt !== null && new Date(job.expiresAt).getTime() <= Date.now();
}

export function ReportAdminPage() {
  const { has } = usePermission();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null,
  );

  const canRead = has('report:read');

  const listQuery = useQuery({
    queryKey: ['admin', 'export-jobs', page],
    queryFn: () => adminExportApi.list(page, PAGE_SIZE),
    enabled: canRead,
    placeholderData: (prev) => prev,
    // Ngừng poll khi không còn job nào đang chạy, tránh gọi API vô hạn
    refetchInterval: (query) => {
      const jobs = query.state.data?.content;
      if (!jobs) return false;
      return jobs.some((job) => RUNNING_STATUSES.includes(job.status))
        ? POLL_INTERVAL_MS
        : false;
    },
  });

  const createJob = useMutation({
    mutationFn: (exportType: ExportType) => adminExportApi.create(exportType),
    onSuccess: (job) => {
      setBanner({
        tone: 'success',
        message: `Đã đặt lịch tạo ${EXPORT_TYPE_LABELS[job.exportType]}. File sẽ sẵn sàng sau ít phút.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'export-jobs'] });
    },
    onError: (error) => {
      setBanner({
        tone: 'danger',
        message:
          error instanceof ApiError ? error.message : 'Không tạo được yêu cầu báo cáo',
      });
    },
  });

  if (!canRead) {
    return <ErrorBlock message="Bạn không có quyền xem báo cáo (report:read)." />;
  }

  const renderTable = () => {
    if (listQuery.isPending) {
      return <LoadingBlock label="Đang tải lịch sử báo cáo…" />;
    }

    if (listQuery.error || !listQuery.data) {
      return (
        <ErrorBlock
          message={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : 'Không tải được lịch sử báo cáo'
          }
          onRetry={() => void listQuery.refetch()}
        />
      );
    }

    const { content: jobs, totalPages } = listQuery.data;

    return (
      <>
        <DataTable
          headers={['Loại', 'Trạng thái', 'Tạo lúc', 'Xong lúc', 'Hết hạn', '']}
          isEmpty={jobs.length === 0}
          empty="Chưa có báo cáo nào được tạo."
        >
          {jobs.map((job) => {
            const expired = isExpired(job);
            const downloadable =
              job.status === 'COMPLETED' && job.resultAssetId !== null && !expired;

            return (
              <tr key={job.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                  {EXPORT_TYPE_LABELS[job.exportType] ?? job.exportType}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <StatusBadge status={job.status} />
                  {job.errorMessage && (
                    <p className="mt-1 max-w-xs text-xs text-red-700">
                      {job.errorMessage}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {formatDateTime(job.queuedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {formatDateTime(job.completedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {formatDateTime(job.expiresAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {downloadable && job.resultAssetId && (
                    <DownloadButton
                      assetId={job.resultAssetId}
                      onError={(message) => setBanner({ tone: 'danger', message })}
                    />
                  )}
                  {job.status === 'COMPLETED' && expired && (
                    <button
                      type="button"
                      disabled
                      className="btn-ghost !px-2 !py-1 text-xs"
                      title="File đã bị xóa khỏi hệ thống"
                    >
                      Đã hết hạn, file đã bị xóa
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>

        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      </>
    );
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        description="Tạo và tải các báo cáo dữ liệu hệ thống dưới dạng file."
      />

      {banner && (
        <ResultBanner
          tone={banner.tone}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <ResultBanner
        tone="warn"
        message="File báo cáo chứa dữ liệu học viên nên sẽ bị XÓA HẲN khỏi hệ thống sau khi quá hạn. Quá hạn rồi thì không tải lại được — cần dùng lại thì phải tạo báo cáo mới. Hãy tải về và lưu trữ đúng quy định ngay khi báo cáo hoàn tất."
      />

      <section className="card mb-5">
        <h2 className="font-semibold text-slate-900">Tạo báo cáo mới</h2>
        <p className="mt-1 text-sm text-slate-500">
          Báo cáo chạy nền; trạng thái cập nhật trong bảng bên dưới.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXPORT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className="btn-secondary"
              disabled={createJob.isPending}
              onClick={() => createJob.mutate(type.value)}
            >
              {createJob.isPending && createJob.variables === type.value
                ? 'Đang tạo…'
                : type.label}
            </button>
          ))}
        </div>
      </section>

      <h2 className="mb-2 font-semibold text-slate-900">Lịch sử báo cáo</h2>
      {renderTable()}
    </div>
  );
}

/**
 * Signed URL có hạn ngắn nên chỉ xin ngay lúc bấm, không lấy sẵn khi render
 * bảng.
 */
function DownloadButton({
  assetId,
  onError,
}: {
  assetId: string;
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
        onError('Máy chủ không trả về đường dẫn tải file — có thể file đã bị xóa.');
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
      className="btn-primary !px-3 !py-1 text-xs"
      disabled={loading}
      onClick={() => void handleClick()}
    >
      {loading ? 'Đang lấy link…' : 'Tải về'}
    </button>
  );
}
