import { describe, expect, it } from 'vitest';
import { ketQuaCauHoi } from '@/features/practice/responseState';
import type { QuestionItem } from '@/types/api';

/**
 * Nhãn đúng / sai / bỏ trống trên từng câu.
 *
 * <p>Điểm dễ sai nhất: câu bỏ trống bị gắn nhãn giống câu làm đúng, vì đáp án
 * đúng lúc nào cũng được tô xanh dù em có chọn hay không.
 */
function cau(patch: Partial<QuestionItem>): QuestionItem {
  return {
    id: 'i1',
    sequenceNo: 1,
    responseType: 'SINGLE_CHOICE',
    required: true,
    maxScore: 1,
    options: [],
    leftItems: [],
    rightItems: [],
    ...patch,
  } as QuestionItem;
}

describe('ketQuaCauHoi', () => {
  it('chọn đúng thì báo đúng', () => {
    const item = cau({ answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } as never });
    expect(ketQuaCauHoi(item, { selectedOptionId: 'A' })).toBe('dung');
  });

  it('chọn sai thì báo sai', () => {
    const item = cau({ answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } as never });
    expect(ketQuaCauHoi(item, { selectedOptionId: 'B' })).toBe('sai');
  });

  it('bỏ trống không bị lẫn với làm đúng', () => {
    const item = cau({ answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } as never });
    expect(ketQuaCauHoi(item, {})).toBe('bo-trong');
  });

  it('nối cặp: thiếu một cặp là sai', () => {
    const item = cau({
      responseType: 'MATCHING',
      answerKey: { type: 'MATCHING', matches: { l1: 'r1', l2: 'r2' } } as never,
    });
    expect(ketQuaCauHoi(item, { matches: { l1: 'r1', l2: 'r2' } })).toBe('dung');
    expect(ketQuaCauHoi(item, { matches: { l1: 'r1', l2: 'r9' } })).toBe('sai');
  });

  it('sắp xếp câu: sai thứ tự là sai', () => {
    const item = cau({
      responseType: 'SENTENCE_ORDERING',
      answerKey: { type: 'ORDERING', orderedOptionIds: ['a', 'b', 'c'] } as never,
    });
    expect(ketQuaCauHoi(item, { orderedOptionIds: ['a', 'b', 'c'] })).toBe('dung');
    expect(ketQuaCauHoi(item, { orderedOptionIds: ['b', 'a', 'c'] })).toBe('sai');
  });

  it('Writing/Speaking không gắn đúng sai, nhưng bỏ trống thì vẫn báo', () => {
    const viet = cau({ responseType: 'LONG_TEXT' });
    expect(ketQuaCauHoi(viet, { textValue: 'Dear Sir...' })).toBeNull();
    expect(ketQuaCauHoi(viet, {})).toBe('bo-trong');

    const noi = cau({ responseType: 'AUDIO_RECORDING' });
    expect(ketQuaCauHoi(noi, { recordingAssetId: 'asset-1' })).toBeNull();
    expect(ketQuaCauHoi(noi, {})).toBe('bo-trong');
  });
});
