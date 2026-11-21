/**
 * Connection of a React widget to the MCP Apps host: the widget model of the
 * last tool result, the host theme (as the dashboard's `.dark` class) and the
 * host calls a widget needs. The widget never calls the network itself.
 */

import { App } from "@modelcontextprotocol/ext-apps";
import { useEffect, useMemo, useState } from "react";

export interface ToolOutcome {
  ok: boolean;
  text: string;
  structured: Record<string, unknown> | undefined;
}

export interface McpAppActions {
  /** Open a dashboard page through the host */
  open(url: string): void;
  /** Send a follow-up request to the assistant, as the person */
  ask(text: string): void;
  /** Call a server tool through the host (saves, confirmations) */
  call(tool: string, args: Record<string, unknown>): Promise<ToolOutcome>;
  /** Tell the assistant what happened in the widget, without sending a message */
  tellModel(text: string): void;
}

export type AppState =
  | { status: "connecting" }
  | { status: "error"; message: string }
  | { status: "ready"; widget: unknown };

type TextBlock = { type: string; text?: string };

function applyTheme(theme: unknown) {
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", Boolean(dark));
}

const textOf = (content: readonly TextBlock[] | undefined) =>
  content?.find((block) => block.type === "text")?.text ?? "";

export function useMcpApp(): { state: AppState; actions: McpAppActions } {
  const app = useMemo(() => new App({ name: "dev-recruit", version: "1.0.0" }), []);
  const [state, setState] = useState<AppState>({ status: "connecting" });

  useEffect(() => {
    applyTheme(undefined);

    const onResult = (result: {
      isError?: boolean;
      content?: readonly TextBlock[];
      structuredContent?: unknown;
    }) => {
      if (result.isError) {
        setState({
          status: "error",
          message: textOf(result.content) || "Si è verificato un errore.",
        });
        return;
      }
      const structured = result.structuredContent as { widget?: unknown } | undefined;
      setState({ status: "ready", widget: structured?.widget });
    };
    const onContext = (context: { theme?: unknown }) => applyTheme(context.theme);

    app.addEventListener("toolresult", onResult);
    app.addEventListener("hostcontextchanged", onContext);
    app
      .connect()
      .then(() => applyTheme(app.getHostContext()?.theme))
      .catch(() =>
        setState({ status: "error", message: "Impossibile collegarsi all'assistente." }),
      );

    return () => {
      app.removeEventListener("toolresult", onResult);
      app.removeEventListener("hostcontextchanged", onContext);
    };
  }, [app]);

  const actions = useMemo<McpAppActions>(
    () => ({
      open(url) {
        app.openLink({ url }).catch(() => undefined);
      },
      ask(text) {
        app
          .sendMessage({ role: "user", content: [{ type: "text", text }] })
          .catch(() => undefined);
      },
      async call(tool, args) {
        const result = await app.callServerTool({ name: tool, arguments: args });
        return {
          ok: !result.isError,
          text: textOf(result.content as TextBlock[] | undefined),
          structured: result.structuredContent as Record<string, unknown> | undefined,
        };
      },
      tellModel(text) {
        app
          .updateModelContext({ content: [{ type: "text", text }] })
          .catch(() => undefined);
      },
    }),
    [app],
  );

  return { state, actions };
}
