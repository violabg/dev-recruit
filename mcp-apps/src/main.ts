/**
 * Entry of the dev-recruit MCP App bundle: connects to the host, follows its
 * theme and draws the widget model of every tool result
 * (`structuredContent.widget`). Links and follow-up requests go through the
 * host; the widget itself never calls the network.
 */

import { App } from "@modelcontextprotocol/ext-apps";
import { isWidgetModel, renderMessage, renderWidget, type WidgetActions } from "./render";
import "./styles.css";

const root = document.getElementById("root")!;
const app = new App({ name: "dev-recruit", version: "1.0.0" });

const actions: WidgetActions = {
  open(url) {
    app.openLink({ url }).catch(() => undefined);
  },
  ask(text) {
    app
      .sendMessage({ role: "user", content: [{ type: "text", text }] })
      .catch(() => undefined);
  },
};

function applyTheme(theme: unknown) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  }
}

function show(element: HTMLElement) {
  root.replaceChildren(element);
}

app.addEventListener("toolresult", (result) => {
  if (result.isError) {
    const text = result.content?.find((block) => block.type === "text");
    show(renderMessage(text && "text" in text ? text.text : "Si è verificato un errore."));
    return;
  }
  const model = (result.structuredContent as { widget?: unknown } | undefined)?.widget;
  show(isWidgetModel(model) ? renderWidget(model, actions) : renderMessage("Dati non disponibili."));
});

app.addEventListener("hostcontextchanged", (context) => applyTheme(context.theme));

show(renderMessage("Caricamento…"));

app
  .connect()
  .then(() => applyTheme(app.getHostContext()?.theme))
  .catch(() => show(renderMessage("Impossibile collegarsi all'assistente.")));
