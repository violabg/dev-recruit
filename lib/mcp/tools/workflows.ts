/**
 * get_workflow: the steps of a dev-recruit task, for the model to fetch before
 * it starts. Reads no selection data.
 */

import { z } from "zod";
import { getWorkflow, renderWorkflow, WORKFLOW_NAMES, WORKFLOWS } from "../workflows";
import { defineTool } from "./types";

export const getWorkflowInputSchema = z.object({
  name: z
    .enum(WORKFLOW_NAMES, { error: "Procedura sconosciuta" })
    .describe(
      WORKFLOWS.map((workflow) => `${workflow.name}: ${workflow.whenToUse}`).join("\n"),
    ),
});

export const getWorkflowTool = defineTool({
  name: "get_workflow",
  title: "Procedura di lavoro",
  description:
    "I passi da seguire per un'attività di dev-recruit (Le mie azioni, nuova posizione, quiz, colloquio, kit, preparazione). Chiamalo prima di iniziare l'attività. Non legge dati della selezione.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getWorkflowInputSchema,
  readOnly: true,
  async handler(_actor, input) {
    return {
      text: renderWorkflow(getWorkflow(input.name)),
      auditSummary: `workflow=${input.name}`,
    };
  },
});
