import { describe, expect, it } from 'vitest';
import type { PlanTask } from '@/types/studyPlan';
import { dayMonth, taskView, todayProgress, weekday } from './studyPlanLogic';

const task = (over: Partial<PlanTask>): PlanTask => ({ key: 'k', type: 'WARMUP', count: 1, minutes: 5, done: false, carried: false, session: false, ...over });

describe('taskView', () => {
  it('luyện theo Part trỏ tới trang Part của kỹ năng', () => {
    const v = taskView(task({ type: 'PART_PRACTICE', skill: 'LISTENING', part: 2, count: 5, minutes: 20 }));
    expect(v.title).toBe('Listening Part 2 · 5 đề');
    expect(v.href).toBe('/luyen-tap/nghe/part-2');
    expect(v.detail).toContain('~20 phút');
  });

  it('Đề trọng điểm Reading đổi số Part theo cách đánh số của web', () => {
    expect(taskView(task({ type: 'MONTHLY_FOCUS', skill: 'READING', part: 2, count: 3 })).href).toBe('/de-trong-diem/doc/2-3');
    expect(taskView(task({ type: 'MONTHLY_FOCUS', skill: 'READING', part: 4, count: 3 })).href).toBe('/de-trong-diem/doc/5');
    expect(taskView(task({ type: 'MONTHLY_FOCUS', skill: 'WRITING', part: 3, count: 1 })).href).toBe('/de-trong-diem/viet');
  });

  it('bài test kỹ năng, thi thử và dự đoán đề', () => {
    expect(taskView(task({ type: 'SKILL_TEST', skill: 'WRITING' })).href).toBe('/luyen-tap/viet/bai-test');
    expect(taskView(task({ type: 'FULL_MOCK' })).href).toBe('/mock-tests');
    expect(taskView(task({ type: 'PREDICTION' })).href).toBe('/du-doan-de');
    expect(taskView(task({ type: 'REST', minutes: 0 })).href).toBeNull();
  });
});

describe('tiện ích', () => {
  it('đếm việc hôm nay, bỏ khởi động và việc nghỉ ngơi', () => {
    expect(todayProgress([task({ done: true }), task({ type: 'GRAMMAR', done: true }), task({ type: 'VOCAB' }), task({ type: 'REST' })])).toEqual({ done: 1, total: 2 });
  });
  it('định dạng ngày', () => {
    expect(dayMonth('2026-11-07')).toBe('7/11');
    expect(weekday('2026-11-17')).toBe('T3');
  });
});
