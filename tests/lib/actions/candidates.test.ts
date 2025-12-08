import {
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "@/lib/actions/candidates";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("candidates actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.position.findUnique).mockResolvedValue({
      id: "pos1",
    } as any);
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: "cand1",
      positionId: "pos1",
      resumeUrl: null,
    } as any);
    vi.mocked(prisma.candidate.create).mockResolvedValue({ id: "new" } as any);
    vi.mocked(prisma.candidate.update).mockResolvedValue({
      id: "cand1",
    } as any);
    vi.mocked(prisma.candidate.delete).mockResolvedValue({
      id: "cand1",
    } as any);
  });

  it("createCandidate creates a candidate", async () => {
    const formData = new FormData();
    formData.append("firstName", "John");
    formData.append("lastName", "Doe");
    formData.append("email", "john@example.com");
    formData.append("positionId", "pos1");

    await createCandidate(formData);

    expect(prisma.candidate.create).toHaveBeenCalled();
  });

  it("updateCandidate updates a candidate", async () => {
    const formData = new FormData();
    formData.append("firstName", "Jane");

    await updateCandidate("cand1", formData);

    expect(prisma.candidate.update).toHaveBeenCalled();
  });

  it("deleteCandidate deletes a candidate", async () => {
    await deleteCandidate("cand1");

    expect(prisma.candidate.delete).toHaveBeenCalled();
  });
});
