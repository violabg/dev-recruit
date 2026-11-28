import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StoryStop } from "@/app/dashboard/applications/[id]/story-stop";
import type { StoryStop as StoryStopModel } from "@/lib/utils/application-story";

const doneStop = (overrides: Partial<StoryStopModel> = {}): StoryStopModel => ({
  key: "test-a1",
  kind: "test",
  title: "Test",
  state: "done",
  outcomeText: "React · Completato · 78/100",
  assessmentId: "a1",
  ...overrides,
});

const currentStop = (overrides: Partial<StoryStopModel> = {}): StoryStopModel => ({
  key: "interview-i1",
  kind: "interview",
  title: "Colloquio 2",
  state: "current",
  interviewId: "i1",
  ...overrides,
});

const futureStop = (overrides: Partial<StoryStopModel> = {}): StoryStopModel => ({
  key: "decision",
  kind: "decision",
  title: "Decisione",
  state: "future",
  unlockText: "Si apre quando tutti i feedback dei colloqui sono inviati",
  ...overrides,
});

describe("StoryStop", () => {
  it("collapses a done stop and toggles its body with Apri and Chiudi", async () => {
    render(
      <StoryStop stop={doneStop()}>
        <p>Corpo del test</p>
      </StoryStop>,
    );

    // The collapsed body is not shown: the panel is not mounted until "Apri".
    const body = screen.queryByText("Corpo del test");
    expect(body).toBeNull();

    const trigger = screen.getByRole("button", { name: /Apri/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.textContent).toContain("Test");
    expect(trigger.textContent).toContain("React · Completato · 78/100");

    fireEvent.click(trigger);

    expect(await screen.findByText("Corpo del test")).toBeVisible();
    const closeTrigger = screen.getByRole("button", { name: /Chiudi/ });
    expect(closeTrigger).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the body of the current stop open and marks it with the primary border", () => {
    render(
      <StoryStop stop={currentStop()}>
        <p>Corpo del colloquio</p>
      </StoryStop>,
    );

    expect(screen.getByRole("heading", { name: "Colloquio 2" })).toBeTruthy();
    expect(screen.getByText("Corpo del colloquio")).toBeVisible();

    const card = screen
      .getByRole("heading", { name: "Colloquio 2" })
      .closest("section");
    expect(card).not.toBeNull();
    expect(card?.classList.contains("border-primary")).toBe(true);
  });

  it("shows the unlock condition of a future stop and no body", () => {
    render(
      <StoryStop stop={futureStop()}>
        <p>Corpo futuro</p>
      </StoryStop>,
    );

    expect(
      screen.getByText("Si apre quando tutti i feedback dei colloqui sono inviati"),
    ).toBeVisible();
    expect(screen.queryByText("Corpo futuro")).toBeNull();
  });

  it("opens a done stop opened by default", async () => {
    render(
      <StoryStop stop={doneStop()} defaultOpen>
        <p>Corpo aperto</p>
      </StoryStop>,
    );

    expect(await screen.findByText("Corpo aperto")).toBeVisible();
    expect(screen.getByRole("button", { name: /Chiudi/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Apri/ })).toBeNull(),
    );
  });
});
