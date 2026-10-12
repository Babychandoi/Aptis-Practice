import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, request, upload } from "./api";
import type {
  Answer,
  Attempt,
  AttemptSummary,
  Exam,
  Group,
  Page,
  Question,
  QuestionType,
  Skill,
  Summary,
  Track,
  User,
} from "./types";
import { labels, rubric, skillInfo, skills, wordCount } from "./types";

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.";
const trackLabel = (track: Track) =>
  track === "ACADEMIC" ? "Academic" : "General Training";
const staff = (user: User) =>
  user.roles.some((r) => ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(r));
const uid = () => crypto.randomUUID();
function Notice({ text }: { text: string }) {
  return text ? (
    <p className="notice" role="status">
      {text}
    </p>
  ) : null;
}
function Pagination({
  page,
  total,
  set,
}: {
  page: number;
  total: number;
  set: (n: number) => void;
}) {
  return total > 1 ? (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => set(page - 1)}>
        Trước
      </button>
      <span>
        {page + 1} / {total}
      </span>
      <button disabled={page + 1 >= total} onClick={() => set(page + 1)}>
        Sau
      </button>
    </div>
  ) : null;
}

export function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    void api
      .restore()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="loading">Đang khôi phục phiên…</div>;
  const authPage = <Auth onLogin={setUser} />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : authPage} />
      <Route path="/register" element={user ? <Navigate to="/" /> : authPage} />
      <Route path="/verify-email" element={<AccountAction />} />
      <Route path="/reset-password" element={<AccountAction />} />
      <Route
        path="/*"
        element={
          user ? (
            <div className="shell">
              <aside>
                <Link className="brand" to="/">
                  <span className="brand-mark">i</span>
                  <span>
                    IELTS<span className="brand-sub">PRACTICE</span>
                  </span>
                </Link>
                <p className="nav-caption">KHÔNG GIAN HỌC TẬP</p>
                <nav>
                  <NavLink to="/" end>
                    Tổng quan
                  </NavLink>
                  <NavLink to="/practice">Ngân hàng đề</NavLink>
                  <NavLink to="/history">Lịch sử luyện tập</NavLink>
                  {staff(user) && (
                    <>
                      <p className="nav-caption">GIẢNG DẠY</p>
                      <NavLink to="/author">Quản lý đề IELTS</NavLink>
                      <NavLink to="/review">Chấm Writing & Speaking</NavLink>
                    </>
                  )}
                </nav>
                <div className="sidebar-note">
                  Mỗi ngày một bước tiến.
                  <small>
                    Luyện đều bốn kỹ năng để tiến gần mục tiêu của bạn.
                  </small>
                </div>
                <div className="user-card">
                  <strong>{user.profile?.fullName || user.email}</strong>
                  <small>
                    {user.premiumActive ? "Premium" : "Tài khoản học viên"}
                  </small>
                  <button
                    onClick={() =>
                      void api.logout().finally(() => setUser(null))
                    }
                  >
                    Đăng xuất
                  </button>
                </div>
              </aside>
              <div className="workspace">
                <header>
                  <span>Không gian luyện IELTS</span>
                  <span className="pill">Academic & General Training</span>
                </header>
                <main>
                  <Routes>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/practice" element={<Catalog />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/attempts/:id" element={<AttemptPage />} />
                    <Route
                      path="/author"
                      element={staff(user) ? <Author /> : <Navigate to="/" />}
                    />
                    <Route
                      path="/review"
                      element={
                        staff(user) ? <ReviewQueue /> : <Navigate to="/" />
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <section className="card">
                          <h1>Không tìm thấy trang</h1>
                          <Link to="/">Về tổng quan</Link>
                        </section>
                      }
                    />
                  </Routes>
                </main>
                <footer>
                  Nền tảng luyện thi độc lập · Điểm luyện tập là ước lượng,
                  không phải kết quả thi IELTS chính thức.
                </footer>
              </div>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
function Auth({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState(
      location.pathname === "/register" ? "register" : "login",
    ),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") onLogin(await api.login(email, password));
      else if (mode === "register") {
        await request("/auth/register", "POST", {
          email,
          password,
          fullName: name,
        });
        setMode("login");
        setError("Đăng ký thành công. Mở email xác thực trước khi đăng nhập.");
      } else {
        await request("/auth/forgot-password", "POST", { email });
        setError(
          "Nếu email có tài khoản, hệ thống sẽ gửi liên kết đặt lại mật khẩu.",
        );
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <section className="auth-intro">
        <span className="eyebrow">IELTS PRACTICE</span>
        <h1>
          Vững từng kỹ năng.
          <br />
          Tiến tới band mục tiêu.
        </h1>
        <p>
          Một không gian tập trung cho Listening, Reading, Writing và Speaking.
        </p>
        <div className="skill-chips">
          {skills.map((s) => (
            <span key={s}>{labels[s]}</span>
          ))}
        </div>
      </section>
      <form className="card auth-form" onSubmit={(e) => void submit(e)}>
        <h2>
          {mode === "login"
            ? "Chào mừng bạn trở lại"
            : mode === "register"
              ? "Bắt đầu hành trình IELTS"
              : "Đặt lại mật khẩu"}
        </h2>
        {mode === "register" && (
          <label>
            Họ và tên
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </label>
        )}
        <label>
          Email
          <input
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "forgot" && (
          <label>
            Mật khẩu
            <input
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <Notice text={error} />
        <button className="primary" disabled={busy}>
          {busy
            ? "Đang xử lý…"
            : mode === "login"
              ? "Đăng nhập"
              : mode === "register"
                ? "Tạo tài khoản"
                : "Gửi liên kết"}
        </button>
        <div className="row">
          <button
            type="button"
            className="text-button"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Đã có tài khoản" : "Tạo tài khoản mới"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setMode(mode === "forgot" ? "login" : "forgot")}
          >
            {mode === "forgot" ? "Đăng nhập" : "Quên mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}
function AccountAction() {
  const [message, setMessage] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const token = new URLSearchParams(location.search).get("token");
  const verify = location.pathname === "/verify-email";
  // Verification stays explicit so an email scanner cannot consume the token.
  async function act(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        verify ? "/auth/verify-email" : "/auth/reset-password",
        "POST",
        verify ? { token } : { token, newPassword: password },
      );
      setMessage(
        verify
          ? "Email đã xác thực. Bạn có thể đăng nhập."
          : "Mật khẩu đã cập nhật.",
      );
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <form className="card auth-form" onSubmit={(e) => void act(e)}>
        <h1>{verify ? "Xác thực email" : "Đặt mật khẩu mới"}</h1>
        {!verify && (
          <label>
            Mật khẩu mới
            <input
              type="password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <Notice text={message} />
        <button className="primary" disabled={busy || !token}>
          Xác nhận
        </button>
        <Link to="/login">Về đăng nhập</Link>
      </form>
    </div>
  );
}
function Dashboard({ user }: { user: User }) {
  const [history, setHistory] = useState<AttemptSummary[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void api
      .history()
      .then((p) => setHistory(p.content))
      .catch((e) => setError(errorText(e)));
  }, []);
  const complete = history.filter((a) => a.status === "COMPLETED"),
    resume = history.find((a) => a.status === "IN_PROGRESS");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HÀNH TRÌNH IELTS CỦA BẠN</p>
          <h1>Chào {user.profile?.fullName || "bạn"}, sẵn sàng luyện tập?</h1>
          <p>Chọn một kỹ năng và dành thời gian cho một bài luyện hôm nay.</p>
        </div>
        <Link className="primary button-link" to="/practice">
          Bắt đầu luyện tập ↗
        </Link>
      </div>
      <Notice text={error} />
      <section className="hero">
        <div>
          <span className="pill light">HỌC CÓ ĐỊNH HƯỚNG</span>
          <h2>
            Band tốt bắt đầu từ
            <br />
            những buổi luyện đều đặn.
          </h2>
          <p>
            Luyện theo từng phần hoặc làm đề đủ kỹ năng.
            <br />
            Xem lại đáp án, nhận góp ý và tiếp tục tiến bộ.
          </p>
          <Link
            className="light-button"
            to={resume ? `/attempts/${resume.id}` : "/practice"}
          >
            {resume ? "Tiếp tục bài đang làm" : "Khám phá ngân hàng đề"} →
          </Link>
        </div>
        <div className="hero-art">
          <div className="band-ring">
            <span>4</span>
            <small>KỸ NĂNG</small>
          </div>
          <p>
            Listening · Reading
            <br />
            Writing · Speaking
          </p>
        </div>
      </section>
      <div className="stats">
        <div className="card">
          <span>Bài gần đây</span>
          <strong>{history.length}</strong>
          <small>Trong trang lịch sử mới nhất</small>
        </div>
        <div className="card">
          <span>Đã hoàn thành</span>
          <strong>{complete.length}</strong>
          <small>Trong {history.length} bài gần đây</small>
        </div>
        <div className="card">
          <span>Chờ giáo viên chấm</span>
          <strong>
            {history.filter((a) => a.status === "PENDING_REVIEW").length}
          </strong>
          <small>Writing & Speaking</small>
        </div>
      </div>
      <div className="section-heading">
        <h2>Luyện theo kỹ năng</h2>
        <Link to="/practice">Xem tất cả →</Link>
      </div>
      <div className="skill-grid">
        {skills.map((s, i) => (
          <Link key={s} to={`/practice?skill=${s}`} className="card skill-card">
            <span className={`skill-icon skill-${i}`}>
              {["◉", "▤", "✎", "◌"][i]}
            </span>
            <small>{s}</small>
            <h3>{labels[s]}</h3>
            <p>{skillInfo[s]}</p>
            <strong>Luyện ngay →</strong>
          </Link>
        ))}
      </div>
      <section className="card tip">
        <h3>Luyện đúng cấu trúc, hiểu đúng điểm số</h3>
        <p>
          Đề ngắn hiển thị số câu đúng. Đề đủ 40 câu Nghe/Đọc mới có band ước
          lượng. Bài Viết và Nói được giáo viên chấm trước khi có band.
        </p>
      </section>
    </>
  );
}
function Catalog() {
  const [track, setTrack] = useState<Track>("ACADEMIC"),
    [skill, setSkill] = useState(
      new URLSearchParams(location.search).get("skill") || "ALL",
    ),
    [page, setPage] = useState(0),
    [data, setData] = useState<Page<Summary>>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    let live = true;
    setError("");
    setData(undefined);
    void api
      .exams(track, page)
      .then((p) => {
        if (live) setData(p);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [track, page]);
  async function start(id: string) {
    setBusy(id);
    setError("");
    try {
      const attempt = await api.start(id);
      nav(`/attempts/${attempt.id}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }
  const rows = data?.content.filter(
    (e) => skill === "ALL" || e.skills.includes(skill as Skill),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRACTICE LIBRARY</p>
          <h1>Ngân hàng đề IELTS</h1>
          <p>Đề luyện theo phần và đề đầy đủ do giáo viên xuất bản.</p>
        </div>
      </div>
      <div className="filters">
        <label>
          Loại bài thi
          <select
            value={track}
            onChange={(e) => {
              setTrack(e.target.value as Track);
              setPage(0);
            }}
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL_TRAINING">General Training</option>
          </select>
        </label>
        <label>
          Kỹ năng trong trang
          <select value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="ALL">Tất cả kỹ năng</option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Notice text={error} />
      {!data && !error && <p>Đang tải đề…</p>}
      <div className="exam-grid">
        {rows?.map((exam) => (
          <section className="card" key={exam.id}>
            <div className="row">
              <span className="pill">{trackLabel(exam.track)}</span>
              <span className="muted">
                {exam.premium ? "Premium" : "Miễn phí"}
              </span>
            </div>
            <h2>{exam.title}</h2>
            <p>
              {exam.skills.map((s) => labels[s]).join(" · ")} ·{" "}
              {exam.questionCount} câu
            </p>
            <small>
              {exam.fullLength
                ? "Đề đầy đủ kỹ năng được liệt kê"
                : "Bài luyện ngắn · không quy đổi band Nghe/Đọc"}
            </small>
            <button
              className="primary"
              disabled={!!busy}
              onClick={() => void start(exam.id)}
            >
              {busy === exam.id ? "Đang tạo bài…" : "Bắt đầu bài luyện →"}
            </button>
          </section>
        ))}
      </div>
      {data && rows?.length === 0 && (
        <section className="card empty">
          <h2>Chưa có đề phù hợp trong trang này</h2>
          <p>Giáo viên có thể tạo hoặc nhập đề tại mục Quản lý đề IELTS.</p>
        </section>
      )}
      {data && <Pagination page={page} total={data.totalPages} set={setPage} />}
    </>
  );
}
function History() {
  const [page, setPage] = useState(0),
    [data, setData] = useState<Page<AttemptSummary>>(),
    [error, setError] = useState("");
  useEffect(() => {
    void api
      .history(page)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [page]);
  return (
    <>
      <h1>Lịch sử luyện tập</h1>
      <p>Tiếp tục bài đang làm hoặc xem điểm và góp ý.</p>
      <Notice text={error} />
      <div className="history-list">
        {data?.content.map((a) => (
          <Link
            className="card history-row"
            key={a.id}
            to={`/attempts/${a.id}`}
          >
            <div>
              <span className="pill">{trackLabel(a.track)}</span>
              <h3>{a.title}</h3>
              <small>
                {a.status === "IN_PROGRESS"
                  ? "Đang làm"
                  : a.status === "PENDING_REVIEW"
                    ? "Chờ giáo viên chấm"
                    : "Đã hoàn thành"}
              </small>
            </div>
            <strong>
              {a.overallBand != null
                ? `Band ${a.overallBand.toFixed(1)}`
                : "Xem bài →"}
            </strong>
          </Link>
        ))}
      </div>
      {data?.content.length === 0 && (
        <p className="card">
          Bạn chưa có bài luyện nào.{" "}
          <Link to="/practice">Bắt đầu tại đây.</Link>
        </p>
      )}
      {data && <Pagination page={page} total={data.totalPages} set={setPage} />}
    </>
  );
}
function Media({
  id,
  assetId,
  reviewing = false,
}: {
  id: string;
  assetId: string;
  reviewing?: boolean;
}) {
  const [url, setUrl] = useState(""),
    [mime, setMime] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(() => {
    void api
      .media(id, assetId, reviewing)
      .then((r) => {
        setUrl(r.url);
        setMime(r.mimeType);
        setError("");
      })
      .catch((e) => setError(errorText(e)));
  }, [id, assetId, reviewing]);
  useEffect(load, [load]);
  return (
    <div>
      {url &&
        (mime.startsWith("image/") ? (
          <img
            className="stimulus-image"
            alt="Hình minh họa đề bài"
            src={url}
            onError={() => setError("Không tải được hình.")}
          />
        ) : (
          <audio
            controls
            src={url}
            onError={() =>
              setError("Liên kết audio hết hạn hoặc file không phát được.")
            }
          />
        ))}
      <Notice text={error} />
      {error && <button onClick={load}>Tải lại audio</button>}
    </div>
  );
}
function Recorder({
  onSave,
  disabled,
  limit = 120,
}: {
  onSave: (id: string) => void;
  disabled: boolean;
  limit?: number;
}) {
  const recorder = useRef<MediaRecorder | undefined>(undefined),
    stream = useRef<MediaStream | undefined>(undefined),
    chunks = useRef<Blob[]>([]),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false),
    [blob, setBlob] = useState<Blob>(),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  async function start() {
    setError("");
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder)
        throw new Error(
          "Trình duyệt chưa hỗ trợ ghi âm. Dùng nút tải file bên dưới.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      chunks.current = [];
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(
        stream.current,
        preferred ? { mimeType: preferred } : undefined,
      );
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        setBlob(new Blob(chunks.current, { type: rec.mimeType }));
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
      };
      rec.start();
      setRecording(true);
      timer.current = setTimeout(
        () => rec.state === "recording" && rec.stop(),
        limit * 1000,
      );
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(errorText(e));
    }
  }
  async function save() {
    if (!blob) return;
    setBusy(true);
    try {
      onSave(await upload(blob, "USER_RECORDING", "ielts-speaking"));
      setError("Ghi âm đã tải lên. Bài sẽ được lưu tự động.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="recorder">
      <p>
        Ghi âm tối đa {limit} giây. Part 2: dành khoảng 1 phút chuẩn bị trước
        khi ghi.
      </p>
      <div className="row">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => (recording ? recorder.current?.stop() : void start())}
        >
          {recording ? "■ Dừng ghi âm" : "● Bắt đầu ghi âm"}
        </button>
        <label className="file-button">
          Hoặc tải file audio
          <input
            type="file"
            accept="audio/webm,audio/ogg,audio/mp4,audio/wav"
            disabled={disabled || recording || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setBlob(f);
            }}
          />
        </label>
      </div>
      {url && <audio controls src={url} />}
      <button
        disabled={disabled || !blob || recording || busy}
        onClick={() => void save()}
      >
        {busy ? "Đang tải…" : "Lưu file ghi âm vào bài"}
      </button>
      <Notice text={error} />
    </div>
  );
}
function AnswerField({
  q,
  value,
  onChange,
  disabled,
  attemptId,
  reviewing = false,
}: {
  q: Question;
  value: Answer;
  onChange: (a: Answer) => void;
  disabled: boolean;
  attemptId: string;
  reviewing?: boolean;
}) {
  if (q.type === "AUDIO_RECORDING")
    return (
      <>
        {value.recordingAssetId && (
          <>
            <small>Ghi âm đã lưu</small>
            <Media
              id={attemptId}
              assetId={value.recordingAssetId}
              reviewing={reviewing}
            />
          </>
        )}
        {!disabled && (
          <Recorder
            disabled={disabled}
            limit={q.responseSeconds ?? 120}
            onSave={(id) => onChange({ recordingAssetId: id })}
          />
        )}
      </>
    );
  if (q.type === "LONG_TEXT")
    return (
      <>
        <textarea
          aria-label="Bài viết"
          rows={12}
          value={value.text ?? ""}
          maxLength={20000}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <small
          className={
            wordCount(value.text) < (q.minWords ?? 0) ? "word-warning" : ""
          }
        >
          {wordCount(value.text)} từ · Tối thiểu {q.minWords ?? 150} từ
        </small>
      </>
    );
  if (q.type === "SHORT_TEXT")
    return (
      <>
        <input
          aria-label="Đáp án"
          value={value.text ?? ""}
          disabled={disabled}
          maxLength={500}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        {q.maxWords && <small>Không quá {q.maxWords} từ</small>}
      </>
    );
  return (
    <div className="options">
      {q.options.map((option) => (
        <label key={option.id}>
          <input
            type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
            name={q.id}
            disabled={disabled}
            checked={value.selected?.includes(option.id) ?? false}
            onChange={(e) =>
              onChange({
                selected:
                  q.type === "MULTIPLE_CHOICE"
                    ? e.target.checked
                      ? [...(value.selected ?? []), option.id]
                      : (value.selected ?? []).filter((id) => id !== option.id)
                    : [option.id],
              })
            }
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}
function AttemptPage() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState<Attempt>(),
    [draft, setDraft] = useState<Record<string, Answer>>({}),
    [error, setError] = useState(""),
    [saveState, setSaveState] = useState("Đã lưu"),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const current = useRef<Attempt | undefined>(undefined),
    pending = useRef<Record<string, Answer>>({}),
    chain = useRef<Promise<void>>(Promise.resolve()),
    submitting = useRef(false);
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await api.attempt(id);
      current.current = a;
      pending.current = {};
      setAttempt(a);
      setDraft(a.responses);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const flush = useCallback(() => {
    chain.current = chain.current
      .catch(() => {})
      .then(async () => {
        const a = current.current;
        if (!a || !Object.keys(pending.current).length) return;
        const batch = { ...pending.current };
        pending.current = {};
        setSaveState("Đang lưu…");
        try {
          const saved = await api.save(a.id, a.version, batch);
          current.current = saved;
          setAttempt(saved);
          setSaveState("Đã lưu");
          setError("");
        } catch (e) {
          pending.current = { ...batch, ...pending.current };
          setSaveState("Chưa lưu");
          setError(errorText(e));
          throw e;
        }
      });
    return chain.current;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 650);
    return () => clearTimeout(timer);
  }, [draft, flush]);
  useEffect(
    () => () => {
      void flush().catch(() => {});
    },
    [flush, id],
  );
  function change(qid: string, value: Answer) {
    pending.current[qid] = value;
    setSaveState("Chưa lưu");
    setDraft((d) => ({ ...d, [qid]: value }));
  }
  const submit = useCallback(
    async (expired = false) => {
      if (submitting.current) return;
      const a = current.current;
      if (!a?.activeSkill) return;
      submitting.current = true;
      setBusy(true);
      try {
        if (!expired) await flush();
        else await chain.current.catch(() => {});
        const saved = await api.submit(a.id, a.activeSkill);
        current.current = saved;
        pending.current = {};
        setAttempt(saved);
        setDraft(saved.responses);
        setSaveState("Đã lưu");
        setError(
          expired
            ? "Hết thời gian kỹ năng. Hệ thống đã nộp phần câu trả lời lưu thành công."
            : "",
        );
      } catch (e) {
        setError(errorText(e));
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [flush],
  );
  const remaining = attempt?.deadline
    ? Math.max(0, Math.ceil((Date.parse(attempt.deadline) - now) / 1000))
    : null;
  useEffect(() => {
    if (attempt?.status === "IN_PROGRESS" && remaining === 0) void submit(true);
  }, [attempt?.activeSkill, attempt?.status, remaining, submit]);
  const unfinished = attempt?.status === "IN_PROGRESS";
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  if (!attempt)
    return (
      <>
        <Notice text={error} />
        <p>Đang tải bài…</p>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {trackLabel(attempt.track)} ·{" "}
            {unfinished ? "ĐANG LÀM BÀI" : "KẾT QUẢ LUYỆN TẬP"}
          </p>
          <h1>{attempt.title}</h1>
        </div>
        {unfinished && (
          <div className="timer">
            <strong>
              {remaining != null
                ? `${Math.floor(remaining / 60)
                    .toString()
                    .padStart(
                      2,
                      "0",
                    )}:${(remaining % 60).toString().padStart(2, "0")}`
                : "—"}
            </strong>
            <small>
              {labels[attempt.activeSkill!]} · {saveState}
            </small>
          </div>
        )}
      </div>
      <Notice text={error} />
      {error && unfinished && (
        <div className="row">
          <button onClick={() => void flush().catch(() => {})}>
            Thử lưu lại
          </button>
          <button onClick={() => void load()}>
            Tải bản đã lưu trên máy chủ
          </button>
        </div>
      )}
      {!unfinished && <Result attempt={attempt} refresh={() => void load()} />}
      <div className="attempt-groups">
        {attempt.groups.map((group) => (
          <section className="card question-group" key={group.id}>
            <div className="section-heading">
              <h2>
                {labels[group.skill]} ·{" "}
                {group.skill === "WRITING" ? "Task" : "Part"} {group.part}
              </h2>
              <span className="pill">{group.questions.length} câu</span>
            </div>
            <h3>{group.title}</h3>
            <p className="instructions">{group.instructions}</p>
            <div className={group.passage ? "question-columns" : ""}>
              {group.passage && (
                <article className="passage">{group.passage}</article>
              )}
              <div>
                {group.assetId && (
                  <Media id={attempt.id} assetId={group.assetId} />
                )}
                <div className="question-jump">
                  {group.questions.map((q, i) => (
                    <a
                      className={draft[q.id] ? "answered" : ""}
                      href={`#q-${q.id}`}
                      key={q.id}
                    >
                      {i + 1}
                    </a>
                  ))}
                </div>
                {group.questions.map((q, i) => (
                  <div className="question" id={`q-${q.id}`} key={q.id}>
                    <h4>
                      <span className="question-no">{i + 1}</span>
                      {q.prompt}
                    </h4>
                    <AnswerField
                      q={q}
                      value={draft[q.id] ?? {}}
                      onChange={(a) => change(q.id, a)}
                      disabled={!unfinished || busy || remaining === 0}
                      attemptId={attempt.id}
                    />
                    {attempt.answers[q.id] && (
                      <div
                        className={
                          attempt.answers[q.id]!.correct
                            ? "answer-feedback correct"
                            : "answer-feedback incorrect"
                        }
                      >
                        <strong>
                          {attempt.answers[q.id]!.correct
                            ? "Đúng"
                            : "Chưa đúng"}
                        </strong>
                        <p>
                          Đáp án:{" "}
                          {attempt.answers[q.id]!.acceptedAnswers.join(" / ")}
                        </p>
                        <p>{attempt.answers[q.id]!.explanation}</p>
                      </div>
                    )}
                    {attempt.reviews[q.id] && (
                      <div className="answer-feedback">
                        <strong>Nhận xét giáo viên</strong>
                        <p>{attempt.reviews[q.id]!.feedback}</p>
                        <div className="criteria-grid">
                          {Object.entries(attempt.reviews[q.id]!.criteria).map(
                            ([key, value]) => (
                              <span key={key}>
                                {key}: <b>{value.toFixed(1)}</b>
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
      {unfinished && (
        <div className="submit-bar">
          <span>Câu trả lời đã lưu có thể khôi phục khi mở lại bài.</span>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void submit(remaining === 0)}
          >
            {busy
              ? "Đang nộp…"
              : `Nộp kỹ năng ${labels[attempt.activeSkill!]} →`}
          </button>
        </div>
      )}
    </>
  );
}
function Result({
  attempt,
  refresh,
}: {
  attempt: Attempt;
  refresh: () => void;
}) {
  return (
    <section className="card result">
      <div className="section-heading">
        <h2>Kết quả của bạn</h2>
        <button onClick={refresh}>Cập nhật điểm</button>
      </div>
      <div className="score-grid">
        {Object.entries(attempt.scores).map(([s, score]) => (
          <div key={s}>
            <small>{labels[s as Skill]}</small>
            <strong>
              {score.band != null
                ? score.band.toFixed(1)
                : score.correct != null
                  ? `${score.correct}/${score.total}`
                  : "—"}
            </strong>
            <span>
              {score.state === "PENDING_REVIEW"
                ? "Chờ giáo viên chấm"
                : score.band != null
                  ? "Band ước lượng"
                  : "Số câu đúng"}
            </span>
          </div>
        ))}
        {attempt.overallBand != null && (
          <div className="overall">
            <small>Overall ước lượng</small>
            <strong>{attempt.overallBand.toFixed(1)}</strong>
          </div>
        )}
      </div>
      {attempt.status === "PENDING_REVIEW" && (
        <p>
          Writing/Speaking đang chờ chấm. Overall xuất hiện khi đủ band của cả 4
          kỹ năng.
        </p>
      )}
      <small>Ngưỡng quy đổi Nghe/Đọc có thể khác giữa các đề thi thật.</small>
    </section>
  );
}

function newQuestion(skill: Skill, part: number): Question {
  return {
    id: uid(),
    type:
      skill === "WRITING"
        ? "LONG_TEXT"
        : skill === "SPEAKING"
          ? "AUDIO_RECORDING"
          : "SHORT_TEXT",
    prompt: "",
    options: [],
    answers: [],
    explanation: "",
    ...(skill === "WRITING"
      ? { minWords: part === 1 ? 150 : 250 }
      : skill === "SPEAKING"
        ? { responseSeconds: part === 2 ? 120 : 60 }
        : { maxWords: 2 }),
  };
}
function newGroup(skill: Skill, part: number): Group {
  return {
    id: uid(),
    skill,
    part,
    title: "",
    instructions: "",
    passage: "",
    questions: [newQuestion(skill, part)],
  };
}
function emptyExam(): Exam {
  return {
    title: "",
    track: "ACADEMIC",
    fullLength: false,
    premium: false,
    published: false,
    groups: [newGroup("READING", 1)],
  };
}
function Author() {
  const [exam, setExam] = useState<Exam>(emptyExam),
    [data, setData] = useState<Page<Exam>>(),
    [page, setPage] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [json, setJson] = useState("");
  const load = useCallback(() => {
    void api
      .authored(page)
      .then(setData)
      .catch((e) => setMessage(errorText(e)));
  }, [page]);
  useEffect(load, [load]);
  function groupChange(index: number, value: Group) {
    setExam((e) => ({
      ...e,
      groups: e.groups.map((g, i) => (i === index ? value : g)),
    }));
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const saved = await api.saveExam(
        advanced ? (JSON.parse(json) as Exam) : exam,
      );
      setExam(saved);
      setJson(JSON.stringify(saved, null, 2));
      setMessage("Đề đã lưu thành công.");
      load();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function fileImport(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("File JSON tối đa 2 MB.");
      const imported = JSON.parse(await file.text()) as Exam;
      delete imported.id;
      delete imported.version;
      imported.published = false;
      setExam(imported);
      setJson(JSON.stringify(imported, null, 2));
      setAdvanced(true);
      setMessage(
        "Đã nhập file vào trình soạn. Kiểm tra và lưu đề để hoàn tất.",
      );
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TEACHER WORKSPACE</p>
          <h1>Quản lý đề IELTS</h1>
          <p>
            Đề mới được lưu nháp. Chỉ giáo viên sở hữu đề hoặc admin được chỉnh
            sửa.
          </p>
        </div>
        <button
          onClick={() => {
            setExam(emptyExam());
            setAdvanced(false);
            setMessage("");
          }}
        >
          + Tạo đề mới
        </button>
      </div>
      <div className="author-layout">
        <section className="card">
          <h2>Đề của bạn</h2>
          {data?.content.map((e) => (
            <button
              className="exam-list-button"
              key={e.id}
              onClick={() => {
                setExam(e);
                setJson(JSON.stringify(e, null, 2));
                setMessage("");
              }}
            >
              <strong>{e.title}</strong>
              <small>
                {e.published ? "Đã xuất bản" : "Bản nháp"} ·{" "}
                {trackLabel(e.track)}
              </small>
            </button>
          ))}
          {data && (
            <Pagination page={page} total={data.totalPages} set={setPage} />
          )}
        </section>
        <section className="card editor">
          <div className="row">
            <h2>{exam.id ? "Chỉnh sửa đề" : "Tạo đề mới"}</h2>
            <label className="file-button">
              Nhập JSON
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void fileImport(f);
                }}
              />
            </label>
            <button
              onClick={() => {
                setJson(JSON.stringify(exam, null, 2));
                setAdvanced(!advanced);
              }}
            >
              {advanced ? "Trình soạn" : "JSON nâng cao"}
            </button>
          </div>
          <Notice text={message} />
          <p className="example-links">
            Đề mẫu tự biên soạn:{" "}
            <a href="/examples/academic-writing.json" download>
              Academic Writing
            </a>{" "}
            ·{" "}
            <a href="/examples/general-writing.json" download>
              General Writing
            </a>{" "}
            ·{" "}
            <a href="/examples/reading-practice.json" download>
              Reading
            </a>{" "}
            ·{" "}
            <a href="/examples/speaking-practice.json" download>
              Speaking
            </a>
            . Tải về rồi nhập JSON.
          </p>
          {advanced ? (
            <>
              <p>
                Sửa trực tiếp cấu trúc group/question. Audio dùng assetId sau
                khi tải file ở trình soạn.
              </p>
              <textarea
                rows={28}
                aria-label="Đề JSON"
                className="json-editor"
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
            </>
          ) : (
            <>
              <label>
                Tiêu đề đề
                <input
                  required
                  maxLength={200}
                  value={exam.title}
                  onChange={(e) => setExam({ ...exam, title: e.target.value })}
                />
              </label>
              <div className="filters">
                <label>
                  Loại bài thi
                  <select
                    value={exam.track}
                    onChange={(e) =>
                      setExam({ ...exam, track: e.target.value as Track })
                    }
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="GENERAL_TRAINING">General Training</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={exam.fullLength}
                    onChange={(e) =>
                      setExam({ ...exam, fullLength: e.target.checked })
                    }
                  />
                  Đề đủ cấu trúc kỹ năng
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={exam.premium}
                    onChange={(e) =>
                      setExam({ ...exam, premium: e.target.checked })
                    }
                  />
                  Premium
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={exam.published}
                    onChange={(e) =>
                      setExam({ ...exam, published: e.target.checked })
                    }
                  />
                  Xuất bản
                </label>
              </div>
              {exam.groups.map((group, index) => (
                <div className="group-editor" key={group.id}>
                  <div className="row">
                    <h3>Nhóm {index + 1}</h3>
                    <button
                      onClick={() =>
                        setExam({
                          ...exam,
                          groups: exam.groups.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Xóa nhóm
                    </button>
                  </div>
                  <div className="filters">
                    <label>
                      Kỹ năng
                      <select
                        value={group.skill}
                        onChange={(e) => {
                          const s = e.target.value as Skill;
                          groupChange(index, newGroup(s, 1));
                        }}
                      >
                        {skills.map((s) => (
                          <option key={s} value={s}>
                            {labels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Part / Task
                      <input
                        type="number"
                        min={1}
                        max={
                          group.skill === "LISTENING"
                            ? 4
                            : group.skill === "WRITING"
                              ? 2
                              : 3
                        }
                        value={group.part}
                        onChange={(e) =>
                          groupChange(index, {
                            ...group,
                            part: Number(e.target.value),
                            questions:
                              group.skill === "WRITING"
                                ? group.questions.map((q) => ({
                                    ...q,
                                    minWords:
                                      Number(e.target.value) === 1 ? 150 : 250,
                                  }))
                                : group.questions,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Tên phần
                    <input
                      value={group.title}
                      onChange={(e) =>
                        groupChange(index, { ...group, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Hướng dẫn
                    <textarea
                      rows={2}
                      value={group.instructions}
                      onChange={(e) =>
                        groupChange(index, {
                          ...group,
                          instructions: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Passage / dữ liệu biểu đồ / cue card
                    <textarea
                      rows={6}
                      value={group.passage}
                      onChange={(e) =>
                        groupChange(index, {
                          ...group,
                          passage: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    {group.skill === "LISTENING"
                      ? "Audio Listening"
                      : "Ảnh bản đồ / biểu đồ"}
                    <input
                      type="file"
                      accept={
                        group.skill === "LISTENING" ? "audio/*" : "image/*"
                      }
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setBusy(true);
                          void upload(
                            f,
                            group.skill === "LISTENING" ? "AUDIO" : "IMAGE",
                            f.name,
                          )
                            .then((id) =>
                              groupChange(index, { ...group, assetId: id }),
                            )
                            .catch((e) => setMessage(errorText(e)))
                            .finally(() => setBusy(false));
                        }
                      }}
                    />
                    {group.assetId && <small>Asset ID: {group.assetId}</small>}
                  </label>
                  {group.questions.map((q, qi) => (
                    <QuestionEditor
                      key={q.id}
                      q={q}
                      group={group}
                      number={qi + 1}
                      update={(value) =>
                        groupChange(index, {
                          ...group,
                          questions: group.questions.map((old, i) =>
                            i === qi ? value : old,
                          ),
                        })
                      }
                      remove={() =>
                        groupChange(index, {
                          ...group,
                          questions: group.questions.filter((_, i) => i !== qi),
                        })
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      groupChange(index, {
                        ...group,
                        questions: [
                          ...group.questions,
                          newQuestion(group.skill, group.part),
                        ],
                      })
                    }
                  >
                    + Thêm câu hỏi
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setExam({
                    ...exam,
                    groups: [...exam.groups, newGroup("READING", 1)],
                  })
                }
              >
                + Thêm nhóm câu hỏi
              </button>
            </>
          )}
          <div className="submit-bar">
            <button
              className="primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Đang xử lý…" : "Lưu đề IELTS"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
function QuestionEditor({
  q,
  group,
  number,
  update,
  remove,
}: {
  q: Question;
  group: Group;
  number: number;
  update: (q: Question) => void;
  remove: () => void;
}) {
  const options = [
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "TRUE_FALSE_NOT_GIVEN",
    "YES_NO_NOT_GIVEN",
    "MATCHING",
    "SHORT_TEXT",
  ] as QuestionType[];
  function changeType(type: QuestionType) {
    const values =
      type === "TRUE_FALSE_NOT_GIVEN"
        ? ["True", "False", "Not Given"]
        : type === "YES_NO_NOT_GIVEN"
          ? ["Yes", "No", "Not Given"]
          : type === "SHORT_TEXT"
            ? []
            : ["A", "B", "C"];
    update({
      ...q,
      type,
      options: values.map((text) => ({ id: text, text })),
      answers: [],
    });
  }
  return (
    <div className="question-editor">
      <div className="row">
        <strong>Câu {number}</strong>
        <button onClick={remove}>Xóa câu</button>
      </div>
      {group.skill !== "WRITING" && group.skill !== "SPEAKING" && (
        <label>
          Dạng câu hỏi
          <select
            value={q.type}
            onChange={(e) => changeType(e.target.value as QuestionType)}
          >
            {options.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Câu hỏi / đề bài
        <textarea
          rows={3}
          value={q.prompt}
          onChange={(e) => update({ ...q, prompt: e.target.value })}
        />
      </label>
      {q.type === "LONG_TEXT" ? (
        <label>
          Số từ tối thiểu
          <input
            type="number"
            value={q.minWords ?? 150}
            onChange={(e) => update({ ...q, minWords: Number(e.target.value) })}
          />
        </label>
      ) : q.type === "AUDIO_RECORDING" ? (
        <label>
          Thời gian ghi âm (giây)
          <input
            type="number"
            min={1}
            max={300}
            value={q.responseSeconds ?? 120}
            onChange={(e) =>
              update({ ...q, responseSeconds: Number(e.target.value) })
            }
          />
        </label>
      ) : (
        <>
          {q.type === "SHORT_TEXT" ? (
            <>
              <label>
                Đáp án chấp nhận (mỗi dòng một đáp án)
                <textarea
                  rows={2}
                  value={q.answers?.join("\n") ?? ""}
                  onChange={(e) =>
                    update({ ...q, answers: e.target.value.split("\n") })
                  }
                />
              </label>
              <label>
                Giới hạn từ
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={q.maxWords ?? 2}
                  onChange={(e) =>
                    update({ ...q, maxWords: Number(e.target.value) })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Lựa chọn (mỗi dòng: mã | nội dung)
                <textarea
                  rows={4}
                  value={q.options.map((o) => `${o.id} | ${o.text}`).join("\n")}
                  onChange={(e) =>
                    update({
                      ...q,
                      options: e.target.value.split("\n").map((line) => {
                        const [id, ...parts] = line.split("|");
                        return {
                          id: id?.trim() ?? "",
                          text: parts.join("|").trim(),
                        };
                      }),
                    })
                  }
                />
              </label>
              <label>
                Mã đáp án đúng (mỗi dòng một mã)
                <textarea
                  rows={2}
                  value={q.answers?.join("\n") ?? ""}
                  onChange={(e) =>
                    update({ ...q, answers: e.target.value.split("\n") })
                  }
                />
              </label>
            </>
          )}
          <label>
            Giải thích đáp án
            <textarea
              rows={2}
              value={q.explanation ?? ""}
              onChange={(e) => update({ ...q, explanation: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
function ReviewQueue() {
  const [page, setPage] = useState(0),
    [data, setData] = useState<Page<AttemptSummary>>(),
    [selected, setSelected] = useState<Attempt>(),
    [error, setError] = useState("");
  const load = useCallback(() => {
    void api
      .queue(page)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [page]);
  useEffect(load, [load]);
  return (
    <>
      <h1>Chấm Writing & Speaking</h1>
      <p>Giáo viên chấm bài thuộc đề do mình tạo. Admin có thể chấm toàn bộ.</p>
      <Notice text={error} />
      <div className="author-layout">
        <section className="card">
          <h2>Bài chờ chấm</h2>
          {data?.content.map((a) => (
            <button
              className="exam-list-button"
              key={a.id}
              onClick={() =>
                void api
                  .reviewDetail(a.id)
                  .then(setSelected)
                  .catch((e) => setError(errorText(e)))
              }
            >
              <strong>{a.title}</strong>
              <small>Mã bài: {a.id.slice(0, 8)}</small>
            </button>
          ))}
          {data?.content.length === 0 && <p>Không có bài chờ chấm.</p>}
          {data && (
            <Pagination page={page} total={data.totalPages} set={setPage} />
          )}
        </section>
        <section>
          {selected ? (
            <>
              <Result attempt={selected} refresh={load} />
              {selected.groups
                .filter((g) => g.skill === "WRITING" || g.skill === "SPEAKING")
                .map((g) => (
                  <section className="card" key={g.id}>
                    <h2>
                      {labels[g.skill]} · Part {g.part}
                    </h2>
                    <article className="passage">{g.passage}</article>
                    {g.assetId && (
                      <Media id={selected.id} assetId={g.assetId} reviewing />
                    )}
                    {g.questions.map((q) => (
                      <ReviewForm
                        key={`${selected.id}-${q.id}`}
                        q={q}
                        group={g}
                        attempt={selected}
                        saved={(a) => {
                          setSelected(a);
                          load();
                        }}
                      />
                    ))}
                  </section>
                ))}
            </>
          ) : (
            <div className="card empty">
              Chọn bài ở bên trái để bắt đầu chấm.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function ReviewForm({
  q,
  group,
  attempt,
  saved,
}: {
  q: Question;
  group: Group;
  attempt: Attempt;
  saved: (a: Attempt) => void;
}) {
  const keys = rubric(q, group.part),
    [criteria, setCriteria] = useState<Record<string, number>>(
      attempt.reviews[q.id]?.criteria ??
        Object.fromEntries(keys.map((k) => [k, 0])),
    ),
    [feedback, setFeedback] = useState(attempt.reviews[q.id]?.feedback ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      saved(await api.review(attempt.id, q.id, criteria, feedback));
      setError("Đã lưu đánh giá.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="question" onSubmit={(e) => void submit(e)}>
      <h3>{q.prompt}</h3>
      <AnswerField
        q={q}
        value={attempt.responses[q.id] ?? {}}
        onChange={() => {}}
        disabled
        attemptId={attempt.id}
        reviewing
      />
      <div className="criteria-grid">
        {keys.map((k) => (
          <label key={k}>
            {k}
            <input
              type="number"
              min={0}
              max={9}
              step={0.5}
              required
              value={criteria[k] ?? 0}
              onChange={(e) =>
                setCriteria({ ...criteria, [k]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <label>
        Nhận xét
        <textarea
          rows={4}
          required
          maxLength={10000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      <Notice text={error} />
      <button className="primary" disabled={busy}>
        {busy ? "Đang lưu…" : "Lưu đánh giá theo rubric"}
      </button>
    </form>
  );
}
