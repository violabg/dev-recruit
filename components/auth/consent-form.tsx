"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useTransition } from "react";
import { toast } from "sonner";

const CONSENT_ERROR = "Impossibile completare l'autorizzazione. Riprova.";

/**
 * "Consenti" / "Rifiuta" of the consent page. The provider answers with the
 * URL to follow: the client's redirect URI with a code, or with
 * error=access_denied after a refusal. The signed OAuth query of the page is
 * forwarded by the oauthProviderClient plugin.
 */
export function ConsentForm() {
  const [isPending, startTransition] = useTransition();

  const decide = (accept: boolean) => {
    startTransition(async () => {
      try {
        const result = await authClient.oauth2.consent({ accept });
        if (result.error || !result.data?.url) {
          toast.error(CONSENT_ERROR);
          return;
        }
        window.location.href = result.data.url;
      } catch {
        toast.error(CONSENT_ERROR);
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        className="flex-1"
        disabled={isPending}
        onClick={() => decide(true)}
      >
        Consenti
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        disabled={isPending}
        onClick={() => decide(false)}
      >
        Rifiuta
      </Button>
    </div>
  );
}
