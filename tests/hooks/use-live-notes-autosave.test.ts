import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/interview-kits", () => ({
  saveKitItemNoteAction: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { useLiveNotesAutosave } from "@/hooks/use-live-notes-autosave";
import { saveKitItemNoteAction } from "@/lib/actions/interview-kits";
import { toast } from "sonner";

const KEY = "live-notes:int-1:user-1";
const params = { interviewId: "int-1", userId: "user-1", debounceMs: 10 };

const stored = () => {
  const raw = window.localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
};

const setOnline = (value: boolean) =>
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });

beforeEach(() => {
  window.localStorage.clear();
  setOnline(true);
  vi.mocked(saveKitItemNoteAction).mockResolvedValue({
    success: true,
    noteId: "n1",
    updatedAt: new Date(),
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useLiveNotesAutosave", () => {
  it("merges the changes of one question, keeps them in storage and sends them once", async () => {
    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { note: "Bene" });
      result.current.queueChange("item-1", { score: 4 });
    });

    expect(stored()).toEqual({ "item-1": { note: "Bene", score: 4 } });
    expect(result.current.pendingCount).toBe(1);

    await waitFor(() => expect(saveKitItemNoteAction).toHaveBeenCalledTimes(1));
    expect(saveKitItemNoteAction).toHaveBeenCalledWith({
      kitItemId: "item-1",
      note: "Bene",
      score: 4,
    });
    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(result.current.pendingCount).toBe(0);
    expect(stored()).toBeNull();
  });

  it("sends each question separately", async () => {
    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { score: 2 });
      result.current.queueChange("item-2", { evidenceQuote: null });
    });

    await waitFor(() => expect(saveKitItemNoteAction).toHaveBeenCalledTimes(2));
    expect(saveKitItemNoteAction).toHaveBeenCalledWith({ kitItemId: "item-1", score: 2 });
    expect(saveKitItemNoteAction).toHaveBeenCalledWith({
      kitItemId: "item-2",
      evidenceQuote: null,
    });
  });

  it("keeps the draft offline and sends it when the connection returns", async () => {
    setOnline(false);
    vi.mocked(saveKitItemNoteAction).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { note: "Offline" });
    });

    await waitFor(() => expect(result.current.status).toBe("offline"));
    expect(stored()).toEqual({ "item-1": { note: "Offline" } });
    expect(result.current.pendingCount).toBe(1);

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(saveKitItemNoteAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(stored()).toBeNull();
  });

  it("reports an error and keeps the draft when the save fails online", async () => {
    vi.mocked(saveKitItemNoteAction).mockResolvedValueOnce({
      success: false,
      error: "Si è verificato un errore. Riprova.",
    } as any);
    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { note: "x" });
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(stored()).toEqual({ "item-1": { note: "x" } });
  });

  it("drops the draft and warns when the scorecard is already submitted", async () => {
    vi.mocked(saveKitItemNoteAction).mockResolvedValueOnce({
      success: false,
      error: "La scheda è già stata inviata",
    } as any);
    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { note: "tardi" });
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("La scheda è già stata inviata"),
    );
    expect(stored()).toBeNull();
    expect(result.current.pendingCount).toBe(0);
  });

  it("restores the drafts left in storage and sends them on mount", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ "item-9": { note: "Ripresa", score: 3 } }),
    );

    const { result } = renderHook(() => useLiveNotesAutosave(params));

    expect(result.current.restoredDrafts).toEqual({
      "item-9": { note: "Ripresa", score: 3 },
    });
    await waitFor(() =>
      expect(saveKitItemNoteAction).toHaveBeenCalledWith({
        kitItemId: "item-9",
        note: "Ripresa",
        score: 3,
      }),
    );
    await waitFor(() => expect(stored()).toBeNull());
  });

  it("ignores a corrupted storage value", () => {
    window.localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useLiveNotesAutosave(params));
    expect(result.current.restoredDrafts).toEqual({});
    expect(saveKitItemNoteAction).not.toHaveBeenCalled();
  });

  it("keeps working in memory when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    const { result } = renderHook(() => useLiveNotesAutosave(params));

    act(() => {
      result.current.queueChange("item-1", { note: "in memoria" });
    });

    await waitFor(() =>
      expect(saveKitItemNoteAction).toHaveBeenCalledWith({
        kitItemId: "item-1",
        note: "in memoria",
      }),
    );
    await waitFor(() => expect(result.current.status).toBe("saved"));
  });
});
