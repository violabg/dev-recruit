import { actionCenterWorkflow } from "./action-center";
import { createPositionWorkflow } from "./create-position";
import { interviewKitWorkflow } from "./interview-kit";
import { interviewPrepWorkflow } from "./interview-prep";
import { quizForCandidateWorkflow } from "./quiz-for-candidate";
import { scheduleInterviewWorkflow } from "./schedule-interview";
import type { McpWorkflow } from "./types";

export type { McpWorkflow } from "./types";

/** Every workflow, in the order clients list them */
export const WORKFLOWS = [
  actionCenterWorkflow,
  createPositionWorkflow,
  quizForCandidateWorkflow,
  scheduleInterviewWorkflow,
  interviewKitWorkflow,
  interviewPrepWorkflow,
] as const satisfies readonly McpWorkflow[];

export type WorkflowName = (typeof WORKFLOWS)[number]["name"];

export const WORKFLOW_NAMES = WORKFLOWS.map((workflow) => workflow.name) as [
  WorkflowName,
  ...WorkflowName[],
];

export function getWorkflow(name: WorkflowName): McpWorkflow {
  return WORKFLOWS.find((workflow) => workflow.name === name)!;
}

/** The text the assistant follows: title, when to use it, steps */
export function renderWorkflow(workflow: McpWorkflow): string {
  return [
    `# ${workflow.title}`,
    "",
    `Quando: ${workflow.whenToUse}`,
    "",
    workflow.steps,
  ].join("\n");
}

/**
 * The plugin's trigger skill of a workflow: Claude matches its description to
 * the request, and the body fetches the steps from the server. Written by
 * `pnpm build:plugin-skills`.
 */
export function pluginSkillMarkdown(workflow: McpWorkflow): string {
  return [
    "---",
    `name: ${workflow.name}`,
    `description: ${workflow.description}`,
    "---",
    "",
    `Usa questa skill quando: ${workflow.whenToUse.charAt(0).toLowerCase()}${workflow.whenToUse.slice(1)}`,
    "",
    `Chiama lo strumento \`get_workflow\` con \`name: "${workflow.name}"\` e segui i passi che restituisce.`,
    "",
  ].join("\n");
}
