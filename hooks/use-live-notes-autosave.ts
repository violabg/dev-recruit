"use client";

import { saveKitItemNoteAction } from "@/lib/actions/interview-kits";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

export type LiveNoteDraft = {
  note?: string | null;
  score?: number | null;
  evidenceQuote?: string | null;
};

type AutosaveStatus = "saved" | "saving" | "offline" | "error";

type Drafts = Record<string, LiveNoteDraft>;

const noopSubscribe = () => () => {};

/** Refusal that makes a draft useless: the author's scorecard is submitted */
const SUBMITTED_MESSAGE = "Il feedback è già stato inviato";

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseDrafts(raw: string | null): Drafts {
  try {
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Drafts)
      : {};
  } catch {
    return {};
  }
}

function writeDrafts(key: string, drafts: Drafts) {
  try {
    if (Object.keys(drafts).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(drafts));
    }
  } catch {
    // Storage unavailable (private mode, quota): autosave keeps working in memory
  }
}

/**
 * Autosave of the live notes of one participant: every change is merged per
 * question, kept in localStorage under 'live-notes:{interviewId}:{userId}'
 * and sent debounced through saveKitItemNoteAction. Pending changes are sent
 * again on mount and when the connection returns.
 */
export function useLiveNotesAutosave({
  interviewId,
  userId,
  debounceMs = 800,
}: {
  interviewId: string;
  userId: string;
  debounceMs?: number;
}) {
  const storageKey = `live-notes:${interviewId}:${userId}`;
  const pendingRef = useRef<Drafts>({});
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  // Storage content found at mount: the server render sees none
  const initialRawRef = useRef<{ key: string; raw: string | null } | null>(
    null,
  );
  const restoredRaw = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (initialRawRef.current?.key !== storageKey) {
        initialRawRef.current = { key: storageKey, raw: readRaw(storageKey) };
      }
      return initialRawRef.current.raw;
    },
    () => null,
  );
  const restoredDrafts = useMemo(() => parseDrafts(restoredRaw), [restoredRaw]);

  const persist = useCallback(() => {
    writeDrafts(storageKey, pendingRef.current);
    setPendingCount(Object.keys(pendingRef.current).length);
  }, [storageKey]);

  const send = useCallback(
    async (kitItemId: string) => {
      const draft = pendingRef.current[kitItemId];
      if (!draft) return;
      setStatus("saving");

      let failure: string | null = null;
      try {
        const result = await saveKitItemNoteAction({ kitItemId, ...draft });
        if (!result.success) failure = result.error;
      } catch {
        failure = "network";
      }

      if (failure === null || failure === SUBMITTED_MESSAGE) {
        // Newer changes arrived meanwhile: they stay pending
        if (pendingRef.current[kitItemId] === draft) {
          delete pendingRef.current[kitItemId];
          persist();
        }
        if (failure === SUBMITTED_MESSAGE) toast.error(SUBMITTED_MESSAGE);
        if (Object.keys(pendingRef.current).length === 0) setStatus("saved");
        return;
      }

      setStatus(navigator.onLine ? "error" : "offline");
    },
    [persist],
  );

  const flushAll = useCallback(() => {
    for (const kitItemId of Object.keys(pendingRef.current)) {
      void send(kitItemId);
    }
  }, [send]);

  const queueChange = useCallback(
    (kitItemId: string, change: LiveNoteDraft) => {
      pendingRef.current = {
        ...pendingRef.current,
        [kitItemId]: { ...pendingRef.current[kitItemId], ...change },
      };
      persist();

      const timers = timersRef.current;
      const previous = timers.get(kitItemId);
      if (previous) clearTimeout(previous);
      timers.set(
        kitItemId,
        setTimeout(() => {
          timers.delete(kitItemId);
          void send(kitItemId);
        }, debounceMs),
      );
    },
    [debounceMs, persist, send],
  );

  // Drafts left by a previous visit (offline, closed tab) are restored and sent
  useEffect(() => {
    pendingRef.current = { ...restoredDrafts, ...pendingRef.current };
    persist();
    flushAll();
  }, [restoredDrafts, persist, flushAll]);

  useEffect(() => {
    window.addEventListener("online", flushAll);
    return () => window.removeEventListener("online", flushAll);
  }, [flushAll]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return { queueChange, pendingCount, status, restoredDrafts };
}
