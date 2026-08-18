import type { QuestionItem, QuestionSection } from '@/types/api';
import type { ResponseDraft } from '@/features/practice/responseState';
import {
  MultipleChoiceRenderer,
  SingleChoiceRenderer,
  SingleChoiceSelectRenderer,
} from '@/features/practice/renderers/ChoiceRenderer';
import { MatchingRenderer } from '@/features/practice/renderers/MatchingRenderer';
import { OrderingRenderer } from '@/features/practice/renderers/OrderingRenderer';
import {
  LongTextRenderer,
  ShortTextRenderer,
} from '@/features/practice/renderers/TextRenderer';
import { RecordingRenderer } from '@/features/practice/renderers/RecordingRenderer';

interface Props {
  item: QuestionItem;
  sections: QuestionSection[];
  attemptId: string;
  questionSetId: string;
  draft: ResponseDraft;
  disabled: boolean;
  showAnswer: boolean;
  choiceMode?: 'cards' | 'select';
  /** Speaking trong bài thi đủ 5 kỹ năng: tự chạy, ghi một lần, không nghe lại. */
  examMode?: boolean;
  /** Ghi âm xong ở chế độ thi — dùng để tự chuyển câu. */
  onExamFinished?: () => void;
  onChange: (draft: ResponseDraft) => void;
}

/**
 * Chọn renderer theo responseType của item. Dạng bài mới chỉ cần thêm một
 * nhánh ở đây và một validator tương ứng ở backend.
 */
export function ItemRenderer(props: Props) {
  const { item, sections, attemptId, questionSetId, draft, disabled, showAnswer, choiceMode, examMode, onExamFinished, onChange } =
    props;

  const shared = { item, draft, disabled, showAnswer, onChange };

  switch (item.responseType) {
    case 'SINGLE_CHOICE':
    case 'GAP_FILL_CHOICE':
      return choiceMode === 'select'
        ? <SingleChoiceSelectRenderer {...shared} />
        : <SingleChoiceRenderer {...shared} />;

    case 'MULTIPLE_CHOICE':
      return <MultipleChoiceRenderer {...shared} />;

    case 'MATCHING':
      return <MatchingRenderer {...shared} sections={sections} />;

    case 'ORDERING':
    case 'SENTENCE_ORDERING':
      return <OrderingRenderer {...shared} />;

    case 'SHORT_TEXT':
    case 'TEXT_EXACT':
      return <ShortTextRenderer {...shared} />;

    case 'LONG_TEXT':
      return <LongTextRenderer {...shared} />;

    case 'AUDIO_RECORDING':
      return (
        <RecordingRenderer
          item={item}
          attemptId={attemptId}
          questionSetId={questionSetId}
          draft={draft}
          disabled={disabled}
          examMode={examMode}
          onExamFinished={onExamFinished}
          onChange={onChange}
        />
      );

    default:
      return (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dạng bài "{item.responseType}" chưa được hỗ trợ trên phiên bản này.
        </p>
      );
  }
}
