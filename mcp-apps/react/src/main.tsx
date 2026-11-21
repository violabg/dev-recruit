/**
 * Entry of the React widget bundle: connects to the host and draws the
 * widget model of the tool result (`structuredContent.widget`) with the
 * dashboard's components.
 */

import type { ReactWidgetModel } from "@/lib/mcp/widgets/types";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Message } from "./message";
import { PositionFormWidgetView } from "./position-form-widget";
import { useMcpApp } from "./use-mcp-app";
import "./styles.css";

const KINDS = new Set<ReactWidgetModel["kind"]>(["position-form"]);

function isReactWidget(value: unknown): value is ReactWidgetModel {
  return (
    typeof value === "object" &&
    value !== null &&
    KINDS.has((value as { kind?: unknown }).kind as ReactWidgetModel["kind"])
  );
}

function Widget() {
  const { state, actions } = useMcpApp();

  if (state.status === "connecting") return <Message>Caricamento…</Message>;
  if (state.status === "error") return <Message tone="error">{state.message}</Message>;
  if (!isReactWidget(state.widget)) return <Message>Dati non disponibili.</Message>;

  switch (state.widget.kind) {
    case "position-form":
      return <PositionFormWidgetView model={state.widget} actions={actions} />;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Widget />
  </StrictMode>,
);
