import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { applyQuestionSetScore, attemptQueryKey, primeAttempt } from '@/features/practice/attemptCache';
import type { Attempt, AttemptQuestionSet, QuestionSetContent, QuestionSetScore } from '@/types/api';

const content = (title: string) => ({ title, items: [] }) as unknown as QuestionSetContent;

const set = (questionSetId: string): AttemptQuestionSet => ({
  attemptQuestionSetId: `aqs-${questionSetId}`,
  questionSetId,
  displayOrder: 1,
  status: 'ANSWERED',
  maxScore: 5,
  awardedScore: null,
  audioPlayCount: 0,
  maxAudioPlays: null,
  hotness: null,
  examYear: null,
  content: content(`chưa lộ ${questionSetId}`),
  savedResponse: null,
});

const attempt = { id: 'at1', questionSets: [set('q1'), set('q2')] } as unknown as Attempt;

describe('attemptCache', () => {
  it('lượt ghi sẵn từ trang tạo lượt khớp đúng khoá AttemptPage đọc', () => {
    const client = new QueryClient();
    primeAttempt(client, attempt);
    // AttemptPage của học viên đọc với studentUserId = undefined
    expect(client.getQueryData(attemptQueryKey('at1', undefined))).toBe(attempt);
  });

  it('chấm riêng một bộ chỉ vá bộ đó, các bộ khác giữ nguyên', () => {
    const client = new QueryClient();
    primeAttempt(client, attempt);
    const score = {
      questionSetId: 'q2',
      awardedScore: 4.5,
      maxScore: 5,
      content: content('đã lộ đáp án'),
    } as QuestionSetScore;

    applyQuestionSetScore(client, 'at1', score);

    const patched = client.getQueryData<Attempt>(attemptQueryKey('at1'))!;
    expect(patched.questionSets[1]).toMatchObject({
      status: 'SCORED',
      awardedScore: 4.5,
      content: score.content,
    });
    expect(patched.questionSets[0]).toBe(attempt.questionSets[0]);
  });
});
