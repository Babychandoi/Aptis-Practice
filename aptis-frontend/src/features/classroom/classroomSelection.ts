/**
 * Lớp giáo viên đang làm việc.
 *
 * Một giáo viên có thể dạy nhiều lớp (V64). Các API /teacher/** đọc lớp đang
 * chọn từ header X-Classroom-Id (xem TeacherClassroomContext phía backend), nên
 * chỉ cần lưu id ở đây và gắn header một chỗ trong axios.
 *
 * Lưu localStorage để mở lại trang vẫn vào đúng lớp vừa làm. Đọc/ghi đều bọc
 * try: trình duyệt chặn storage thì chỉ mất phần "nhớ lớp", backend tự lấy lớp
 * đầu tiên.
 */
const KEY = 'aptis.teacher.classroomId';

let current: string | null = (() => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
})();

export function selectedClassroomId(): string | null {
  return current;
}

export function setSelectedClassroomId(id: string | null) {
  current = id;
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* chỉ mất phần nhớ lớp */
  }
}
