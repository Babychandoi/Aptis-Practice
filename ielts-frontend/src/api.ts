import type {
  Answer,
  Attempt,
  AttemptSummary,
  Exam,
  Page,
  Skill,
  Summary,
  Track,
  User,
} from "./types";
let accessToken: string | null = null;
let refresh: Promise<void> | null = null;
const root = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
async function renew() {
  refresh ??= fetch(`${root}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: "{}",
  })
    .then(async (r) => {
      if (!r.ok) {
        accessToken = null;
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      const data = (await r.json()) as { accessToken: string };
      accessToken = data.accessToken;
    })
    .finally(() => {
      refresh = null;
    });
  return refresh;
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const response = await fetch(`${root}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    await renew();
    return request<T>(path, method, body, false);
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new Error(error.message ?? error.code ?? `Lỗi ${response.status}`);
  }
  return response.status === 204 ||
    response.headers.get("content-length") === "0"
    ? (undefined as T)
    : response
        .text()
        .then((s) => (s ? (JSON.parse(s) as T) : (undefined as T)));
}
export const api = {
  restore: async () => {
    await renew();
    return request<User>("/me");
  },
  login: async (email: string, password: string) => {
    const result = await request<{ accessToken: string }>(
      "/auth/login",
      "POST",
      { email, password },
    );
    accessToken = result.accessToken;
    return request<User>("/me");
  },
  logout: async () => {
    try {
      await request("/auth/logout", "POST", {});
    } finally {
      accessToken = null;
    }
  },
  exams: (track: Track, page = 0) =>
    request<Page<Summary>>(`/ielts/exams?track=${track}&page=${page}`),
  start: (examId: string) =>
    request<Attempt>("/ielts/attempts", "POST", { examId }),
  attempt: (id: string) => request<Attempt>(`/ielts/attempts/${id}`),
  history: (page = 0) =>
    request<Page<AttemptSummary>>(`/ielts/attempts?page=${page}`),
  save: (id: string, version: number, responses: Record<string, Answer>) =>
    request<Attempt>(`/ielts/attempts/${id}/responses`, "PUT", {
      version,
      responses,
    }),
  submit: (id: string, skill: Skill) =>
    request<Attempt>(`/ielts/attempts/${id}/submit-skill`, "POST", { skill }),
  authored: (page = 0) =>
    request<Page<Exam>>(`/ielts/author/exams?page=${page}`),
  saveExam: (exam: Exam) =>
    request<Exam>(
      `/ielts/author/exams${exam.id ? `/${exam.id}` : ""}`,
      exam.id ? "PUT" : "POST",
      exam,
    ),
  queue: (page = 0) =>
    request<Page<AttemptSummary>>(`/ielts/review/queue?page=${page}`),
  reviewDetail: (id: string) => request<Attempt>(`/ielts/review/${id}`),
  review: (
    id: string,
    qid: string,
    criteria: Record<string, number>,
    feedback: string,
  ) =>
    request<Attempt>(`/ielts/review/${id}/questions/${qid}`, "PUT", {
      criteria,
      feedback,
    }),
  media: (id: string, assetId: string, reviewing = false) =>
    request<{ url: string; mimeType: string }>(
      `/ielts/${reviewing ? "review" : "attempts"}/${id}/media/${assetId}`,
    ),
};
export async function upload(
  blob: Blob,
  assetType: string,
  filename: string,
): Promise<string> {
  const mimeType = blob.type.split(";")[0] || "audio/webm";
  const result = await request<{ assetId: string; uploadUrl: string }>(
    "/assets/upload-url",
    "POST",
    { assetType, mimeType, filename, fileSize: blob.size },
  );
  const response = await fetch(result.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!response.ok) throw new Error("Không tải được file. Vui lòng thử lại.");
  await request(`/assets/${result.assetId}/complete`, "POST", {});
  return result.assetId;
}
