# Client bindings

How the canonical roles and skills become files a client runs. The installer applies these rules from the client profile; this contract is also the rule set for a client without a profile.

## Roles

The payload has eight roles. Their frontmatter names their `invocation` and abstract `operations`:

- `user` roles: `orchestrator`, `ask`, `knowledge-builder`. Each runs as the main conversation of its own session, because it asks the user questions and holds halt points.
- `delegate` roles: `explorer`, `code-implementor`, `design-verifier`, `implementation-verifier`, `documentation-reviewer`. Only the orchestrator starts them. Its contract names the ones it may start: `explorer`, `code-implementor` and the client's general-purpose agent. A client that enforces that list (OpenCode's `task` permission) refuses any other delegate, `documentation-reviewer` included, although the DOCUMENTATION review step asks for it; the other clients take the list as an instruction.

Operations map to the client's tools through the profile's `tools`: `read`, `search`, `write`, `terminal`, `question`, `runtime`, plus `delegate` for a role that has delegates. `runtime` means the runtime command and nothing else: a role with `runtime` but no `terminal` may use the terminal only for that command, which the installer states in the role's Bindings section. Every `#operation:<op>` a role or skill body names (for example `#operation:question`, the role's question tool) gets a line in its Bindings section naming the profile's native tools for that operation (`vscode/askQuestions` for GitHub Copilot in VS Code) and stating that it is never a runtime command; a profile with no tools listed for it falls back to the client's own tool.

Native names are the prefix plus the canonical name (`shop-code-implementor`). Role bodies stay verbatim: they keep canonical names such as `role: code-implementor`, and each file's Bindings section maps them to native names.

## Route of the user roles

One route per client, chosen in phase C:

- **Native**: the user roles are agents the user selects in the client (an agent picker, a primary-agent switch). Use it only when that works on every surface the team uses.
- **Skill**: the user roles are skills the user invokes by name (`shop-orchestrator`, `shop-ask`, `shop-knowledge-builder`). Each embeds the complete role contract, refuses to start inside a conversation that already runs a role, and is excluded from automatic invocation where the client allows it. On this route the client does not enforce a role's tool list; the role's limits are instructions, and the Bindings section says so.

The skills `plan-bug-from-id` and `plan-user-story-from-id` run under the orchestrator. On the skill route they load the orchestrator skill first; on the native route they stop unless the orchestrator agent is active. Either way the developer still names the workflow type.

## Delegates

Delegates are always hidden subagents with their own context, started by the orchestrator with only the prompt the workflow step gives. The orchestrator's Bindings section names the client's mechanism, the native names, the built-in agent that serves `general-purpose`, and whether a delegate can be resumed by id. Without resume, the steps' arm for a host without resume applies: start the same role again with the complete correction prompt.

A delegate sees only its own file. When the orchestrator passes a prompt that names a capability the delegate's file does not bind (always the case for `general-purpose`), it appends that capability's binding line to the prompt.

A client without native subagents uses its CLI as a separate process (`delegation: "subprocess"`, the profile's `subprocess` command): the prompt first tells the process to read the role's file as its instructions. A client with neither has the workflows blocked. Never run a delegate inline.

## Host capability bindings

Every `#capability:<token>` of kind `host` that an installed role or skill uses needs a binding in the answers file: the tracker tokens (`work-item-*`), the wiki tokens (`wiki-*`), `visual-evidence`. The installer writes each one into the Bindings section of the files that use it and adds the binding's `tools` to those roles' tool lists. A token bound to `{ "none": "<reason>" }` tells the role to skip the step and say so.

Runtime tokens need no binding: each is a command of the runtime.

## A client without a profile

Render its files by hand, following the client's current documentation:

1. Write the role files and skills in the client's native format, with every rule above: verbatim bodies with slots filled from the answers, the Bindings section the installer would write (render one with `install.mjs show` for a profiled client as a model), delegates as hidden subagents.
2. Add the client's permission for the runtime command and outside locations.
3. Record every file you wrote in the answers file under `environments[].handRendered` with its path and purpose, so maintenance knows it is not installer output.
4. Verify it like any other client (`contracts/install-and-verify.md`).

If the client cannot run the user roles as main conversations, give delegates their own context, or run the runtime command, mark the affected workflows `blocked` for that client.
