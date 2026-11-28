import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { PositionTabs } from "@/app/dashboard/positions/[id]/position-tabs";
import { TabsContent } from "@/components/ui/tabs";
import type { PositionTab } from "@/lib/utils/position-setup";

const renderTabs = (tab: PositionTab, incomplete = false) =>
  render(
    <PositionTabs tab={tab} incomplete={incomplete}>
      <TabsContent value="candidati">Contenuto candidati</TabsContent>
      <TabsContent value="criteri">Contenuto criteri</TabsContent>
      <TabsContent value="dettagli">Contenuto dettagli</TabsContent>
    </PositionTabs>,
  );

beforeEach(() => {
  replace.mockClear();
});

describe("PositionTabs", () => {
  it("shows the three tab triggers", () => {
    renderTabs("dettagli");

    expect(screen.getByRole("tab", { name: "Candidati" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Criteri e domande" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Dettagli" })).toBeTruthy();
  });

  it("marks Criteri e domande as to complete only when the position is incomplete", () => {
    renderTabs("dettagli", false);
    expect(screen.queryByText("da completare")).toBeNull();

    renderTabs("dettagli", true);
    expect(screen.getByText("da completare")).toBeTruthy();
  });

  it("writes the new tab in the URL without scrolling", async () => {
    renderTabs("dettagli");

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Contenuto dettagli")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Criteri e domande" }));

    expect(await screen.findByText("Contenuto criteri")).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("?tab=criteri", { scroll: false });
  });

  it("follows a later change of the tab prop", async () => {
    const { rerender } = renderTabs("dettagli");

    rerender(
      <PositionTabs tab="candidati" incomplete={false}>
        <TabsContent value="candidati">Contenuto candidati</TabsContent>
        <TabsContent value="criteri">Contenuto criteri</TabsContent>
        <TabsContent value="dettagli">Contenuto dettagli</TabsContent>
      </PositionTabs>,
    );

    expect(await screen.findByText("Contenuto candidati")).toBeTruthy();
    expect(screen.queryByText("Contenuto dettagli")).toBeNull();
  });
});
