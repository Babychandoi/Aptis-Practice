import type { ItemResponsePayload, QuestionItem, SavedResponse } from '@/types/api';

/**
 * Câu trả lời đang giữ trong bộ nhớ trình duyệt, khóa theo itemId.
 * Dùng chung một shape cho mọi dạng bài; chỉ trường tương ứng responseType
 * được gửi lên backend.
 */
export type ResponseDraft = {
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  matches?: Record<string, string>;
  orderedOptionIds?: string[];
  textValue?: string;
  recordingAssetId?: string;
};

export type ResponseMap = Record<string, ResponseDraft>;

/** Nạp câu trả lời đã lưu ở server để người dùng tiếp tục bài đang làm dở. */
export function hydrateResponses(saved: SavedResponse | null): ResponseMap {
  if (!saved) return {};

  const map: ResponseMap = {};
  for (const response of saved.itemResponses) {
    map[response.itemId] = {
      selectedOptionId: response.selectedOptionId ?? undefined,
      selectedOptionIds: response.selectedOptionIds ?? undefined,
      matches: response.matches ?? undefined,
      orderedOptionIds: response.orderedOptionIds ?? undefined,
      textValue: response.textValue ?? undefined,
      recordingAssetId: response.recordingAssetId ?? undefined,
    };
  }
  return map;
}

/**
 * Chuyển draft thành payload gửi backend. Bỏ qua item chưa trả lời để autosave
 * không ghi đè bằng giá trị rỗng.
 */
export function toPayload(
  items: QuestionItem[],
  responses: ResponseMap,
): ItemResponsePayload[] {
  const payloads: ItemResponsePayload[] = [];

  for (const item of items) {
    const draft = responses[item.id];
    if (!draft || !hasAnswer(item, draft)) continue;

    payloads.push({
      itemId: item.id,
      responseType: item.responseType,
      selectedOptionId: draft.selectedOptionId ?? null,
      selectedOptionIds: draft.selectedOptionIds ?? [],
      matches: draft.matches ?? {},
      orderedOptionIds: draft.orderedOptionIds ?? [],
      textValue: draft.textValue ?? null,
      recordingAssetId: draft.recordingAssetId ?? null,
    });
  }

  return payloads;
}

function hasAnswer(item: QuestionItem, draft: ResponseDraft): boolean {
  switch (item.responseType) {
    case 'SINGLE_CHOICE':
    case 'GAP_FILL_CHOICE':
      return Boolean(draft.selectedOptionId);
    case 'MULTIPLE_CHOICE':
      return (draft.selectedOptionIds?.length ?? 0) > 0;
    case 'MATCHING':
      return Object.keys(draft.matches ?? {}).length > 0;
    case 'ORDERING':
    case 'SENTENCE_ORDERING':
      return (draft.orderedOptionIds?.length ?? 0) > 0;
    case 'SHORT_TEXT':
    case 'TEXT_EXACT':
    case 'LONG_TEXT':
      return Boolean(draft.textValue?.trim());
    case 'AUDIO_RECORDING':
      return Boolean(draft.recordingAssetId);
    default:
      return false;
  }
}

/** Số item đã trả lời, dùng cho thanh tiến độ. */
export function countAnswered(items: QuestionItem[], responses: ResponseMap): number {
  return items.filter((item) => {
    const draft = responses[item.id];
    return draft ? hasAnswer(item, draft) : false;
  }).length;
}

export function wordCount(text: string | undefined): number {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
