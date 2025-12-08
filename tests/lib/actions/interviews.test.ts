import { deleteInterview, startInterview } from "@/lib/actions/interviews";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("interviews actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "int1",
      token: "token1",
    } as any);
    vi.mocked(prisma.interview.delete).mockResolvedValue({ id: "int1" } as any);
  });

  it("startInterview starts an interview", async () => {
    await startInterview("token1");

    expect(prisma.interview.findUnique).toHaveBeenCalled();
  });

  it("deleteInterview deletes an interview", async () => {
    await deleteInterview("int1");

    expect(prisma.interview.delete).toHaveBeenCalled();
  });
});
