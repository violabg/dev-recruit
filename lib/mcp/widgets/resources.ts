/**
 * MCP App resources: the widget bundle served under one ui:// URI per
 * enabled widget, and the tool metadata that links a tool to its widget.
 * The bundle allows no external origin (empty CSP): it reads only the tool
 * result it is given, and links open through the host.
 */

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { WidgetId } from "../tools/types";
import { WIDGET_HTML } from "./html.generated";

/** Widgets that ship; the draft and prep widgets join in their phase */
export const ENABLED_WIDGETS: readonly WidgetId[] = [
  "action-center",
  "position",
  "application-flow",
];

const WIDGET_TITLE: Record<WidgetId, string> = {
  "action-center": "Le mie azioni",
  position: "Posizione",
  "application-flow": "Candidatura",
  "draft-preview": "Anteprima bozza",
  "interview-prep": "Preparazione colloquio",
};

export const widgetUri = (id: WidgetId) => `ui://dev-recruit/${id}.html`;

const UI_META = { csp: {}, prefersBorder: true };

/** The `_meta` of a tool with a shipped widget, or undefined */
export function widgetToolMeta(id: WidgetId | undefined) {
  if (!id || !ENABLED_WIDGETS.includes(id)) return undefined;
  const uri = widgetUri(id);
  // Both keys: hosts on the legacy flat key still find the widget
  return { ui: { resourceUri: uri }, "ui/resourceUri": uri };
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
            text: WIDGET_HTML,
            _meta: { ui: UI_META },
          },
        ],
      }),
    );
  }
}
