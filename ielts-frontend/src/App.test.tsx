// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";
import { api } from "./api";
import type { Attempt, User } from "./types";
vi.mock("./api", () => ({
  api: {
    restore: vi.fn(),
    attempt: vi.fn(),
    save: vi.fn(),
    submit: vi.fn(),
    history: vi.fn(),
    exams: vi.fn(),
  },
  request: vi.fn(),
  upload: vi.fn(),
}));
const user: User = {
  id: "u",
  email: "student@example.test",
  roles: ["STUDENT"],
  premiumActive: false,
};
function attempt(): Attempt {
  return {
    id: "a",
    version: 0,
    title: "Reading practice",
    track: "ACADEMIC",
    status: "IN_PROGRESS",
    fullLength: false,
    activeSkill: "READING",
    deadline: new Date(Date.now() + 600_000).toISOString(),
    groups: [
      {
        id: "g",
        skill: "READING",
        part: 1,
        title: "Passage",
        passage: "The library opened in 2018.",
        instructions: "Write ONE WORD OR A NUMBER.",
        questions: [
          {
            id: "q",
            type: "SHORT_TEXT",
            prompt: "When did the library open?",
            options: [],
            maxWords: 1,
          },
        ],
      },
    ],
    responses: {},
    scores: { READING: { total: 1, state: "IN_PROGRESS" } },
    answers: {},
    reviews: {},
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.restore).mockResolvedValue(user);
  vi.mocked(api.attempt).mockResolvedValue(attempt());
});
afterEach(cleanup);
describe("IELTS learner workflows", () => {
  it("hides teacher navigation for students and renders the real question", async () => {
    render(
      <MemoryRouter initialEntries={["/attempts/a"]}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByText("When did the library open?");
    expect(screen.queryByText("Quản lý đề IELTS")).toBeNull();
    expect(screen.queryByText(/Đáp án:/)).toBeNull();
    expect(screen.getByLabelText("Đáp án")).toBeDefined();
  });
  it("serializes autosaves and submits only after the latest response is persisted", async () => {
    let resolveFirst: (a: Attempt) => void = () => {};
    vi.mocked(api.save).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    vi.mocked(api.save).mockImplementation(async (_id, version, responses) => ({
      ...attempt(),
      version: version + 1,
      responses,
    }));
    vi.mocked(api.submit).mockResolvedValue({
      ...attempt(),
      status: "COMPLETED",
      activeSkill: undefined,
      deadline: undefined,
    });
    render(
      <MemoryRouter initialEntries={["/attempts/a"]}>
        <App />
      </MemoryRouter>,
    );
    const input = await screen.findByLabelText("Đáp án");
    fireEvent.change(input, { target: { value: "201" } });
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    fireEvent.change(input, { target: { value: "2018" } });
    fireEvent.click(screen.getByRole("button", { name: "Nộp kỹ năng Đọc →" }));
    expect(api.submit).not.toHaveBeenCalled();
    await act(async () =>
      resolveFirst({
        ...attempt(),
        version: 1,
        responses: { q: { text: "201" } },
      }),
    );
    await waitFor(() =>
      expect(api.submit).toHaveBeenCalledWith("a", "READING"),
    );
    expect(api.save).toHaveBeenNthCalledWith(2, "a", 1, {
      q: { text: "2018" },
    });
  });
  it("does not submit when saving fails, and retains the draft for retry", async () => {
    vi.mocked(api.save).mockRejectedValue(new Error("Connection interrupted"));
    render(
      <MemoryRouter initialEntries={["/attempts/a"]}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Đáp án"), {
      target: { value: "2018" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nộp kỹ năng Đọc →" }));
    await screen.findByText("Connection interrupted");
    expect(api.submit).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Đáp án") as HTMLInputElement).value).toBe(
      "2018",
    );
  });
});
