import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/interview-proposals", () => ({
  confirmInterviewProposal: vi.fn(),
  discardInterviewProposal: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
  invalidateCandidateCache: vi.fn(),
  invalidateInterviewProposalCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  discardInterviewProposalAction,
  scheduleInterviewProposalAction,
} from "@/lib/actions/interview-proposals";
import {
  confirmInterviewProposal,
  discardInterviewProposal,
} from "@/lib/services/interview-proposals";
import { UserError } from "@/lib/services/user-error";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
  invalidateInterviewProposalCache,
} from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

beforeEach(() => {
  vi.mocked(confirmInterviewProposal).mockResolvedValue({
    interviewId: "int-1",
    applicationId: "app-1",
    stage: { changed: true, candidateId: "c1", positionId: "pos-1", applicationId: "app-1" } as any,
  });
  vi.mocked(discardInterviewProposal).mockResolvedValue({ applicationId: "app-1" });
});

describe("scheduleInterviewProposalAction", () => {
  it("schedules through the shared service, refreshes the caches and opens the preparation", async () => {
    await scheduleInterviewProposalAction({ proposalId: "prop-1" });

    expect(confirmInterviewProposal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user1" }),
      "prop-1",
    );
    expect(invalidateInterviewCache).toHaveBeenCalledWith({ interviewId: "int-1", applicationId: "app-1" });
    expect(invalidateInterviewProposalCache).toHaveBeenCalledWith({ applicationId: "app-1" });
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "c1",
      positionId: "pos-1",
      applicationId: "app-1",
    });
    expect(redirect).toHaveBeenCalledWith(
      "/dashboard/applications/app-1/interviews/int-1/prepare?scheduled=1",
    );
  });

  it("returns the Italian message of a refusal", async () => {
    vi.mocked(confirmInterviewProposal).mockRejectedValueOnce(
      new UserError("Proposta non trovata o già gestita"),
    );

    const result = await scheduleInterviewProposalAction({ proposalId: "prop-1" });

    expect(result).toMatchObject({ success: false, error: "Proposta non trovata o già gestita" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("discardInterviewProposalAction", () => {
  it("discards and refreshes the proposals of the application", async () => {
    const result = await discardInterviewProposalAction({ proposalId: "prop-1" });

    expect(result).toMatchObject({ success: true });
    expect(discardInterviewProposal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user1" }),
      "prop-1",
    );
    expect(invalidateInterviewProposalCache).toHaveBeenCalledWith({ applicationId: "app-1" });
  });
});
