import { getViewerId } from "@/lib/auth-server";
import { OwnerControls } from "@/components/applications/owner-controls";
import type { ApplicationOwner } from "@/lib/data/applications";

/**
 * Session-dependent part of the application header: the viewer's id decides
 * whether "Prendi in carico" or "Rilascia" is offered. The viewer id is
 * cached for the session, so this block ships in the App Shell and in the
 * per-link prefetch instead of suspending after navigation.
 */
export async function ApplicationOwnerControls({
  applicationId,
  owner,
}: {
  applicationId: string;
  owner: ApplicationOwner;
}) {
  const currentUserId = await getViewerId();

  return (
    <OwnerControls
      applicationId={applicationId}
      owner={owner}
      currentUserId={currentUserId}
    />
  );
}
