/**
 * MCP App resources: the widget bundles (DOM and React) served under one
 * ui:// URI per enabled widget, and the tool metadata that links a tool to its widget.
 * The bundle allows no external origin (empty CSP): it reads only the tool
 * result it is given, and links open through the host.
 */

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { WidgetId } from "../tools/types";
import { WIDGET_HTML } from "./html.generated";
import { REACT_WIDGET_HTML } from "./react-html.generated";

/** Widgets that ship */
export const ENABLED_WIDGETS: readonly WidgetId[] = [
  "action-center",
  "position",
  "application-flow",
  "draft-preview",
  "interview-prep",
  "position-form",
  "quiz-form",
  "schedule-form",
];

/** Widgets drawn by the React bundle (mcp-apps/react); the others by the DOM bundle */
const REACT_WIDGETS: readonly WidgetId[] = ["position-form", "quiz-form", "schedule-form"];

const widgetHtml = (id: WidgetId) =>
  REACT_WIDGETS.includes(id) ? REACT_WIDGET_HTML : WIDGET_HTML;

const WIDGET_TITLE: Record<WidgetId, string> = {
  "action-center": "Le mie azioni",
  position: "Posizione",
  "application-flow": "Candidatura",
  "draft-preview": "Anteprima bozza",
  "interview-prep": "Preparazione colloquio",
  "position-form": "Nuova posizione",
  "quiz-form": "Nuovo quiz",
  "schedule-form": "Nuovo colloquio",
};

export const widgetUri = (id: WidgetId) => `ui://dev-recruit/${id}.html`;

const UI_META = { csp: {}, prefersBorder: true };

/**
 * The `_meta` of a tool: its shipped widget, and for an app-only tool the
 * visibility that hides it from the model. Undefined when neither applies.
 */
export function widgetToolMeta(
  id: WidgetId | undefined,
  options: { appOnly?: boolean } = {},
) {
  const shipped = id && ENABLED_WIDGETS.includes(id) ? widgetUri(id) : null;
  if (!shipped && !options.appOnly) return undefined;

  return {
    ui: {
      ...(shipped ? { resourceUri: shipped } : {}),
      ...(options.appOnly ? { visibility: ["app"] } : {}),
    },
    // Legacy flat key: hosts on the older key still find the widget
    ...(shipped ? { "ui/resourceUri": shipped } : {}),
  };
}

type ResourceServer = Parameters<typeof registerAppResource>[0];

export function registerWidgetResources(server: ResourceServer): void {
  for (const id of ENABLED_WIDGETS) {
    const uri = widgetUri(id);
    registerAppResource(
      server,
      `widget-${id}`,
      uri,
      {
        title: WIDGET_TITLE[id],
        description: `Widget dev-recruit: ${WIDGET_TITLE[id]}`,
        mimeType: RESOURCE_MIME_TYPE,
        _meta: { ui: UI_META },
      },
      async () => ({
        contents: [
          {
            uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: widgetHtml(id),
            _meta: { ui: UI_META },
          },
        ],
      }),
    );
  }
}
