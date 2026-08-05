import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminContentApi } from '@/api/adminEndpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, Pager, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { AccessLevel, ContentStatus } from '@/types/admin';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'IN_REVIEW', label: 'Chờ duyệt' },
  { value: 'CHANGES_REQUESTED', label: 'Cần sửa' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'SUSPENDED', label: 'Tạm ẩn' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
];

const ACCESS_LABELS: Record<AccessLevel, string> = {
  FREE: 'Miễn phí',
  PREMIUM: 'Premium',
};

export function QuestionSetListPage() {
  const navigate = useNavigate();
  const { has } = usePermission();

  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);

  /**
   * Chỉ giá trị đã lắng mới đi vào queryKey — gõ phím không kéo theo một lượt
   * gọi API cho mỗi ký tự.
   */
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      // Kết quả mới bắt đầu lại từ đầu, không giữ trang của bộ lọc cũ
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ['admin', 'question-sets', { status, q: debouncedSearch, page }],
    queryFn: () =>
      adminContentApi.search({
        status: status === '' ? undefined : status,
        q: debouncedSearch === '' ? undefined : debouncedSearch,
        page,
        size: PAGE_SIZE,
      }),
    // Giữ dữ liệu trang trước trong lúc tải để bảng không nháy trắng
    placeholderData: (prev) => prev,
  });

  const filters = (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[180px]">
        <label htmlFor="status-filter" className="label">
          Trạng thái
        </label>
        <select
          id="status-filter"
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContentStatus | '');
            setPage(0);
          }}
        >
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[240px] flex-1">
        <label htmlFor="q-filter" className="label">
          Tìm kiếm
        </label>
        <input
          id="q-filter"
          type="search"
          className="input"
          placeholder="Tìm theo mã hoặc tiêu đề"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
    </div>
  );

  const body = () => {
    if (listQuery.isPending) {
      return <LoadingBlock label="Đang tải ngân hàng câu hỏi…" />;
    }

    if (listQuery.error || !listQuery.data) {
      return (
        <ErrorBlock
          message={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : 'Không tải được danh sách bộ câu hỏi'
          }
          onRetry={() => void listQuery.refetch()}
        />
      );
    }

    const { content: questionSets, totalPages, totalElements } = listQuery.data;

    return (
      <>
        <p className="mb-2 text-xs text-slate-500">{totalElements} bộ câu hỏi</p>

        <DataTable
          headers={[
            'Mã',
            'Tiêu đề',
            'Part',
            'Dạng bài',
            'Mức truy cập',
            'Số câu',
            'Trạng thái',
            'Cập nhật',
          ]}
          isEmpty={questionSets.length === 0}
          empty="Không có bộ câu hỏi nào khớp bộ lọc."
        >
          {questionSets.map((questionSet) => (
            <tr
              key={questionSet.id}
              onClick={() => navigate(`/admin/question-sets/${questionSet.id}`)}
              className="cursor-pointer transition-colors hover:bg-brand-50"
            >
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                {questionSet.code}
              </td>
              <td className="px-4 py-2.5 font-medium text-slate-900">
                {questionSet.title}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {questionSet.partName}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {questionSet.taskTypeCode}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {ACCESS_LABELS[questionSet.accessLevel]}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {questionSet.itemCount}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={questionSet.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {formatDateTime(questionSet.updatedAt)}
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      </>
    );
  };

  return (
    <div>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Tìm, lọc và mở bộ câu hỏi để xem trước hoặc chuyển trạng thái."
        actions={has('question_set:write') ? (
          <button type="button" className="btn-primary" onClick={() => navigate('/admin/question-sets/new')}>
            + Tạo bộ câu hỏi
          </button>
        ) : undefined}
      />
      {filters}
      {body()}
    </div>
  );
}
