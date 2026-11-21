"use client";

import { Switch } from "@/components/ui/switch";
import { setMcpEnabledAction, setUserMcpDisabledAction } from "@/lib/actions/mcp";
import { errorMessage, unwrap, type ActionResult } from "@/lib/utils/action-result";
import { useId, useTransition } from "react";
import { toast } from "sonner";

type McpAccessState = {
  enabled: boolean;
  users: { id: string; name: string; email: string; mcpDisabled: boolean }[];
};

function notify(result: ActionResult, success: string) {
  try {
    unwrap(result);
    toast.success(success);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

/** Global MCP switch and the per-user MCP switches. */
export function McpSwitches({ state }: { state: McpAccessState }) {
  const [isPending, startTransition] = useTransition();
  const globalId = useId();

  const toggleGlobal = (enabled: boolean) => {
    startTransition(async () => {
      notify(
        await setMcpEnabledAction(enabled),
        enabled ? "MCP attivato per tutti" : "MCP disattivato per tutti",
      );
    });
  };

  const toggleUser = (userId: string, disabled: boolean) => {
    startTransition(async () => {
      notify(
        await setUserMcpDisabledAction(userId, disabled),
        disabled ? "MCP disattivato per l'utente" : "MCP riattivato per l'utente",
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 p-4 border rounded-lg">
        <Switch
          id={globalId}
          checked={state.enabled}
          disabled={isPending}
          onCheckedChange={(checked) => toggleGlobal(checked)}
        />
        <label htmlFor={globalId} className="flex flex-col gap-0.5">
          <span className="font-medium">MCP attivo per tutti</span>
          <span className="text-muted-foreground text-sm">
            Spento, ogni chiamata da Claude e VS Code viene rifiutata.
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Utenti</h2>
        {state.users.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessun utente attivo</p>
        ) : (
          <ul className="flex flex-col border rounded-lg divide-y">
            {state.users.map((user) => (
              <li key={user.id} className="flex justify-between items-center gap-4 px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-muted-foreground text-xs">{user.email}</span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={user.mcpDisabled}
                    disabled={isPending}
                    aria-label={`MCP disattivato per ${user.name}`}
                    onCheckedChange={(checked) => toggleUser(user.id, checked)}
                  />
                  MCP disattivato
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
