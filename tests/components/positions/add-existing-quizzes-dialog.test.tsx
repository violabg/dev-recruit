import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/quizzes", () => ({
  addExistingQuizzesToPositionAction: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AddExistingQuizzesDialog } from "@/components/positions/add-existing-quizzes-dialog";
import { addExistingQuizzesToPositionAction } from "@/lib/actions/quizzes";
import type { QuizPickerOption } from "@/lib/data/quizzes";
import { toast } from "sonner";

const options: QuizPickerOption[] = [
  {
    id: "quiz-own",
    title: "Quiz della posizione",
    timeLimit: 20,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    questionCount: 4,
    questionTypes: ["multiple_choice"],
    position: {
      id: "pos-1",
      title: "Frontend",
      experienceLevel: "senior",
      status: "open",
    },
  },
  {
    id: "quiz-react",
    title: "Quiz React",
    timeLimit: 30,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    questionCount: 5,
    questionTypes: ["multiple_choice", "code_snippet"],
    position: {
      id: "pos-2",
      title: "Fullstack",
      experienceLevel: "mid",
      status: "open",
    },
  },
  {
    id: "quiz-node",
    title: "Quiz Node",
    timeLimit: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    questionCount: 3,
    questionTypes: ["open_question"],
    position: {
      id: "pos-3",
      title: "Backend",
      experienceLevel: "junior",
      status: "closed",
    },
  },
];

const renderDialog = () =>
  render(
    <AddExistingQuizzesDialog
      positionId="pos-1"
      quizzesPromise={Promise.resolve(options)}
      positionQuizTitles={["Quiz della posizione"]}
    />,
  );

/** Opens the dialog and waits for the promise to resolve */
const openDialog = async () => {
  renderDialog();
  fireEvent.click(
    screen.getByRole("button", { name: "Aggiungi quiz esistenti" }),
  );
  expect(await screen.findByText("2 quiz")).toBeTruthy();
};

/** Opens the dropdown and picks the quiz with this title */
const pickQuiz = async (title: string) => {
  const input = screen.getByRole("combobox", { name: "Seleziona quiz" });
  await act(async () => {
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
  });
  const item = await screen.findByRole("option", {
    name: new RegExp(title),
  });
  await act(async () => {
    fireEvent.click(item);
  });
  // The open popup hides the rest of the dialog: close it
  await act(async () => {
    fireEvent.keyDown(input, { key: "Escape" });
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Aggiungi (1)" })).toBeTruthy(),
  );
};

beforeEach(() => {
  vi.mocked(addExistingQuizzesToPositionAction).mockReset();
  refresh.mockClear();
});

describe("AddExistingQuizzesDialog", () => {
  it("renders an enabled trigger", () => {
    renderDialog();

    const trigger = screen.getByRole("button", {
      name: "Aggiungi quiz esistenti",
    });
    expect(trigger.hasAttribute("disabled")).toBe(false);
  });

  it("offers only the quizzes of other positions", async () => {
    await openDialog();

    expect(screen.getByText("Aggiungi quiz esistenti", { selector: "h2" }))
      .toBeTruthy();
    const input = screen.getByRole("combobox", { name: "Seleziona quiz" });
    await act(async () => {
      fireEvent.click(input);
      fireEvent.keyDown(input, { key: "ArrowDown" });
    });

    expect(
      await screen.findByRole("option", { name: /Quiz React/ }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: /Quiz Node/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Quiz della posizione/ }))
      .toBeNull();
  });

  it("narrows the list when searching by title", async () => {
    await openDialog();

    fireEvent.change(screen.getByLabelText("Cerca"), {
      target: { value: "react" },
    });

    expect(await screen.findByText("1 quiz")).toBeTruthy();
  });

  it("narrows the list by question type", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("checkbox", { name: "Aperta" }));

    expect(await screen.findByText("1 quiz")).toBeTruthy();
  });

  it("keeps the confirm button disabled until a quiz is selected", async () => {
    await openDialog();

    const confirm = screen.getByRole("button", { name: "Aggiungi (0)" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
  });

  it("adds the selected quiz, confirms in Italian and refreshes the tab", async () => {
    vi.mocked(addExistingQuizzesToPositionAction).mockResolvedValue({
      success: true,
      count: 1,
      quizIds: ["new"],
    } as never);
    await openDialog();
    await pickQuiz("Quiz React");

    fireEvent.click(screen.getByRole("button", { name: "Aggiungi (1)" }));

    await waitFor(() =>
      expect(addExistingQuizzesToPositionAction).toHaveBeenCalledWith({
        positionId: "pos-1",
        quizIds: ["quiz-react"],
      }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "1 quiz aggiunto alla posizione",
      ),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the error and keeps the dialog open with the selection", async () => {
    vi.mocked(addExistingQuizzesToPositionAction).mockResolvedValue({
      success: false,
      error: "Uno o più quiz non esistono più",
    } as never);
    await openDialog();
    await pickQuiz("Quiz Node");

    fireEvent.click(screen.getByRole("button", { name: "Aggiungi (1)" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Uno o più quiz non esistono più",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByText("Aggiungi quiz esistenti", { selector: "h2" }))
      .toBeTruthy();
    expect(screen.getByRole("button", { name: "Aggiungi (1)" })).toBeTruthy();
  });
});
