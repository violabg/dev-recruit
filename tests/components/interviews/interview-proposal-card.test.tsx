import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/interview-proposals", () => ({
  scheduleInterviewProposalAction: vi.fn(),
  discardInterviewProposalAction: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { InterviewProposalCard } from "@/components/interviews/interview-proposal-card";
import {
  discardInterviewProposalAction,
  scheduleInterviewProposalAction,
} from "@/lib/actions/interview-proposals";
import type { InterviewProposalItem } from "@/lib/data/interview-proposals";
import { toast } from "sonner";

const proposal: InterviewProposalItem = {
  id: "prop-1",
  round: 2,
  scheduledAt: new Date("2026-11-25T09:00:00Z"),
  durationMinutes: 45,
  meetingUrl: null,
  guideTitle: "Colloquio tecnico",
  participants: [
    { userId: "u1", name: "Paola Verdi", role: "lead" },
    { userId: "u2", name: "Marco Neri", role: "observer" },
  ],
  createdAt: new Date("2026-11-21T10:00:00Z"),
  createdByName: "Paola Verdi",
};

beforeEach(() => {
  vi.mocked(scheduleInterviewProposalAction).mockReset();
  vi.mocked(discardInterviewProposalAction).mockReset();
  refresh.mockClear();
});

describe("InterviewProposalCard", () => {
  it("shows round, guide, participants, author and the Proposta badge", () => {
    render(<InterviewProposalCard proposal={proposal} canSchedule />);

    expect(screen.getByText("Round 2")).toBeTruthy();
    expect(screen.getByText("· Colloquio tecnico")).toBeTruthy();
    expect(screen.getByText("Proposta")).toBeTruthy();
    expect(screen.getByText(/Marco Neri/)).toBeTruthy();
    expect(screen.getByText(/Proposta da Paola Verdi con l'assistente/)).toBeTruthy();
  });

  it("schedules after the confirmation", async () => {
    vi.mocked(scheduleInterviewProposalAction).mockResolvedValue(undefined as never);
    render(<InterviewProposalCard proposal={proposal} canSchedule />);

    fireEvent.click(screen.getByRole("button", { name: "Pianifica" }));
    expect(await screen.findByText("Pianificare il colloquio proposto?")).toBeTruthy();
    const confirm = screen.getAllByRole("button", { name: "Pianifica" }).at(-1)!;
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(scheduleInterviewProposalAction).toHaveBeenCalledWith({ proposalId: "prop-1" }),
    );
  });

  it("discards after the confirmation and refreshes the tab", async () => {
    vi.mocked(discardInterviewProposalAction).mockResolvedValue({
      success: true,
      data: { applicationId: "app-1" },
    } as never);
    render(<InterviewProposalCard proposal={proposal} canSchedule />);

    fireEvent.click(screen.getByRole("button", { name: "Scarta" }));
    expect(await screen.findByText("Scartare la proposta?")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Scarta" }).at(-1)!);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(discardInterviewProposalAction).toHaveBeenCalledWith({ proposalId: "prop-1" });
    expect(toast.success).toHaveBeenCalledWith("Proposta scartata");
  });

  it("offers only Scarta on a closed application", () => {
    render(<InterviewProposalCard proposal={proposal} canSchedule={false} />);

    expect(screen.queryByRole("button", { name: "Pianifica" })).toBeNull();
    expect(screen.getByRole("button", { name: "Scarta" })).toBeTruthy();
    expect(screen.getByText(/si può solo scartare/)).toBeTruthy();
  });
});
