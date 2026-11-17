import { describe, expect, it } from 'vitest';
import { resolvePageKey } from '@/lib/pageTracking';

describe('resolvePageKey', () => {
  it.each([
    ['/', 'dashboard'],
    ['/du-doan-de', 'exam-prediction'],
    ['/lo-trinh', 'study-plan'],
    ['/lo-trinh/test', 'study-plan'],
    // Đề trọng điểm tháng: mục lục, trình luyện, câu lạc bộ Writing
    ['/de-trong-diem', 'monthly-focus'],
    ['/de-trong-diem/nghe', 'monthly-focus'],
    ['/de-trong-diem/viet', 'monthly-focus'],
    ['/de-trong-diem/nghe/1', 'monthly-focus-practice'],
    ['/de-trong-diem/doc/2-3', 'monthly-focus-practice'],
    ['/de-trong-diem/viet/clb/691c946d116f587d549bb8f2', 'monthly-focus-writing-club'],
    // Luyện tập: giới thiệu bài test chứa cả "/bai-test" nên phải tách riêng
    ['/luyen-tap/doc', 'component'],
    ['/luyen-tap/doc/part-1', 'part'],
    ['/luyen-tap/doc/theo-part', 'component-parts'],
    ['/luyen-tap/doc/bai-test', 'component-tests'],
    ['/luyen-tap/doc/bai-test/bp1/gioi-thieu', 'component-test-intro'],
    ['/components/c1', 'component'],
    ['/parts/p1', 'part'],
    ['/ai-english-lounge', 'ai-lounge'],
    ['/ai-voice/plans', 'ai-voice-plans'],
    ['/cong-cu', 'tools'],
    ['/lop-hoc', 'classroom'],
    ['/lop-hoc/cls1', 'classroom'],
    ['/lop/tham-gia', 'classroom'],
    ['/giang-day/hoc-vien/u1/bai-lam/a1', 'teaching'],
  ])('%s -> %s', (path, key) => {
    expect(resolvePageKey(path)).toBe(key);
  });

  it('không theo dõi trang đăng nhập và quản trị', () => {
    expect(resolvePageKey('/login')).toBeNull();
    expect(resolvePageKey('/admin/users')).toBeNull();
  });
});
