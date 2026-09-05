import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimPlayback,
  currentPlaybackOwner,
  releasePlayback,
  resetPlaybackForTest,
} from '@/features/practice/audioSession';

/** Audio giả — chỉ cần đếm số lần bị pause. */
function fakeAudio(name: string) {
  return { name, pause: vi.fn() };
}

describe('audioSession', () => {
  beforeEach(() => resetPlaybackForTest());

  it('dừng bài đang phát khi mở bài khác', () => {
    const cau1 = fakeAudio('câu 1');
    const cau2 = fakeAudio('câu 2');

    claimPlayback(cau1);
    expect(cau1.pause).not.toHaveBeenCalled();

    // Học viên bấm sang câu 2 khi câu 1 chưa dừng
    claimPlayback(cau2);

    expect(cau1.pause).toHaveBeenCalledTimes(1);
    expect(currentPlaybackOwner()).toBe(cau2);
  });

  it('không tự dừng chính mình khi bấm lại cùng một bài', () => {
    const cau1 = fakeAudio('câu 1');

    claimPlayback(cau1);
    claimPlayback(cau1);

    expect(cau1.pause).not.toHaveBeenCalled();
  });

  it('dừng đúng một bài dù có nhiều bài trên trang', () => {
    // Listening Part 1 hiện 13 câu cùng lúc
    const cacCau = Array.from({ length: 13 }, (_, i) => fakeAudio(`câu ${i + 1}`));

    for (const cau of cacCau) {
      claimPlayback(cau);
    }

    // Mỗi bài chỉ bị dừng đúng một lần, bởi bài kế tiếp
    for (const cau of cacCau.slice(0, 12)) {
      expect(cau.pause).toHaveBeenCalledTimes(1);
    }
    expect(cacCau[12]?.pause).not.toHaveBeenCalled();
    expect(currentPlaybackOwner()).toBe(cacCau[12]);
  });

  it('bỏ ghi nhận khi bài kết thúc, để bài sau không bị dừng oan', () => {
    const cau1 = fakeAudio('câu 1');
    const cau2 = fakeAudio('câu 2');

    claimPlayback(cau1);
    releasePlayback(cau1); // audio chạy hết
    expect(currentPlaybackOwner()).toBeNull();

    claimPlayback(cau2);
    // cau1 đã kết thúc rồi, không được gọi pause thêm lần nữa
    expect(cau1.pause).not.toHaveBeenCalled();
  });

  it('bỏ ghi nhận của bài KHÁC thì không xoá nhầm bài đang phát', () => {
    const dangPhat = fakeAudio('đang phát');
    const daDung = fakeAudio('đã dừng');

    claimPlayback(dangPhat);
    // Component của bài khác bị gỡ khỏi trang
    releasePlayback(daDung);

    expect(currentPlaybackOwner()).toBe(dangPhat);
  });
});
