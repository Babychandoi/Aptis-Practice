/**
 * Một audio phát tại một thời điểm, trên toàn trang.
 *
 * Listening Part 1 hiện cả 13 câu cùng lúc, mỗi câu một thẻ audio riêng. Mở câu
 * thứ hai trong khi câu đầu chưa dừng thì hai bài nghe chồng lên nhau và không
 * nghe được gì — trình duyệt không tự xử lý việc này.
 *
 * Trạng thái để ở cấp module chứ không phải state React: các AudioPlayer là
 * component riêng biệt, không có component cha chung nào giữ giúp.
 */

/** Kiểu tối thiểu cần dùng — đủ để test không cần một phần tử DOM thật. */
export interface Pausable {
  pause: () => void;
}

let currentlyPlaying: Pausable | null = null;

/**
 * Dừng audio đang phát (nếu khác cái sắp phát) rồi ghi nhận cái mới.
 *
 * Gọi TRƯỚC khi play() chứ không đợi sự kiện onPlay: play() trả về promise, đợi
 * tới lúc đó thì đã có khoảng hở hai bài cùng kêu.
 */
export function claimPlayback(next: Pausable): void {
  if (currentlyPlaying && currentlyPlaying !== next) {
    currentlyPlaying.pause();
  }
  currentlyPlaying = next;
}

/** Bỏ ghi nhận khi audio dừng hẳn hoặc bị gỡ khỏi trang. */
export function releasePlayback(audio: Pausable): void {
  if (currentlyPlaying === audio) {
    currentlyPlaying = null;
  }
}

/** Chỉ dùng cho test. */
export function currentPlaybackOwner(): Pausable | null {
  return currentlyPlaying;
}

/** Chỉ dùng cho test — dọn trạng thái giữa các trường hợp kiểm thử. */
export function resetPlaybackForTest(): void {
  currentlyPlaying = null;
}
