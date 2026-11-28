"use client";

import { Button } from "@/components/ui/button";
import { setApplicationOwnerAction } from "@/lib/actions/applications";
import type { ApplicationOwner } from "@/lib/data/applications";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * The recruiter in charge of an application, with "Prendi in carico" and
 * "Rilascia". The owner never limits who can work on the application.
 */
export function OwnerControls({
  applicationId,
  owner,
  currentUserId,
}: {
  applicationId: string;
  owner: ApplicationOwner;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isMine = owner?.id === currentUserId;

  const setOwner = (value: "me" | "none") => {
    startTransition(async () => {
      try {
        unwrap(await setApplicationOwnerAction({ applicationId, owner: value }));
        toast.success(
          value === "me" ? "Candidatura presa in carico" : "Candidatura rilasciata",
        );
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  return isMine ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => setOwner("none")}
    >
      {isPending && <Loader2 className="size-4 animate-spin" />}
      Rilascia
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => setOwner("me")}
    >
      {isPending && <Loader2 className="size-4 animate-spin" />}
      Prendi in carico
    </Button>
  );
}
