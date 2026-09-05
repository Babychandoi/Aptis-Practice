// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from '@/features/practice/AudioPlayer';
import { resetPlaybackForTest } from '@/features/practice/audioSession';

// Không gọi API thật: chỉ cần một URL để thẻ audio được render
vi.mock('@/api/endpoints', () => ({
  assetApi: {
    signedUrl: vi.fn().mockResolvedValue({ signedUrl: 'blob:audio-gia' }),
  },
}));

/**
 * jsdom không cài đặt play/pause — gọi vào là ném lỗi "Not implemented".
 * Thay bằng bản giả có theo dõi trạng thái paused để kiểm được hành vi thật.
 */
function stubMediaElement() {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
      this.dispatchEvent(new Event('pause'));
    }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    value: true,
    writable: true,
  });
}

const asset = (id: string) => [{ assetId: id, role: 'MAIN_AUDIO', displayOrder: 1 }];

/** Đợi signedUrl về và thẻ audio xuất hiện. */
async function renderPlayer(ui: React.ReactElement) {
  const result = render(ui);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe('AudioPlayer', () => {
  beforeEach(() => {
    resetPlaybackForTest();
    stubMediaElement();
  });
  afterEach(cleanup);

  it('áp trạng thái tắt tiếng lên thẻ audio, không chỉ giữ trong state', async () => {
    const { container } = await renderPlayer(
      <AudioPlayer assets={asset('a1')} maxAudioPlays={null} initialPlayCount={0} disabled={false} />,
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).not.toBeNull();
    expect(audio.muted).toBe(false);

    // Bấm nút loa
    await act(async () => {
      screen.getByLabelText('Tắt tiếng').click();
    });
    expect(audio.muted).toBe(true);

    // Bấm lại: phải NGHE LẠI được. Đây chính là lỗi cũ — state đổi nhưng thuộc
    // tính trên thẻ audio không đổi theo, nên thanh thời gian chạy mà im tiếng.
    await act(async () => {
      screen.getByLabelText('Bật tiếng').click();
    });
    expect(audio.muted).toBe(false);
  });

  it('mở bài thứ hai thì bài đầu dừng lại', async () => {
    const first = await renderPlayer(
      <AudioPlayer assets={asset('a1')} maxAudioPlays={null} initialPlayCount={0} disabled={false} />,
    );
    const second = await renderPlayer(
      <AudioPlayer assets={asset('a2')} maxAudioPlays={null} initialPlayCount={0} disabled={false} />,
    );

    const audio1 = first.container.querySelector('audio') as HTMLAudioElement;
    const audio2 = second.container.querySelector('audio') as HTMLAudioElement;

    await act(async () => {
      (first.container.querySelector('button[aria-label="Phát audio"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect(audio1.paused).toBe(false);

    await act(async () => {
      (second.container.querySelector('button[aria-label="Phát audio"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    // Đây là lỗi chính: trước đây cả hai cùng phát
    expect(audio1.paused).toBe(true);
    expect(audio2.paused).toBe(false);
  });

  it('nút loa chỉ tắt tiếng, KHÔNG dừng bài — nút phát vẫn đúng trạng thái', async () => {
    const { container } = await renderPlayer(
      <AudioPlayer assets={asset('a1')} maxAudioPlays={null} initialPlayCount={0} disabled={false} />,
    );
    const audio = container.querySelector('audio') as HTMLAudioElement;

    await act(async () => {
      (container.querySelector('button[aria-label="Phát audio"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await act(async () => {
      screen.getByLabelText('Tắt tiếng').click();
    });

    // Vẫn đang phát, chỉ là không ra tiếng — và nút vẫn hiện Tạm dừng để bấm
    expect(audio.paused).toBe(false);
    expect(audio.muted).toBe(true);
    expect(container.querySelector('button[aria-label="Tạm dừng audio"]')).not.toBeNull();
  });

  it('gỡ khỏi trang thì audio dừng, không chạy tiếp ở nền', async () => {
    const { container, unmount } = await renderPlayer(
      <AudioPlayer assets={asset('a1')} maxAudioPlays={null} initialPlayCount={0} disabled={false} />,
    );
    const audio = container.querySelector('audio') as HTMLAudioElement;

    await act(async () => {
      (container.querySelector('button[aria-label="Phát audio"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect(audio.paused).toBe(false);

    unmount();
    expect(audio.paused).toBe(true);
  });
});
