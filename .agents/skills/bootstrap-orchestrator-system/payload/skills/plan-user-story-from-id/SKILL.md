---
name: plan-user-story-from-id
description: "This prompt is used to generate an implementation plan based on a work item ID provided by the user."
invocation: user
role: orchestrator
---

You need to plan an implementation based the on the work item id provided by the user.
If user don't provide a work item id, ask for it.

Use the available tools to invoke subagent. The subagent sees only the prompt you pass, not this file: append to the template the runtime lines of this file's Bindings section and the line of every `#capability:` token the template names.
Use the following prompt template for the subagent:

```
Activate agent session with id `<sessionId>` with `#capability:session-activate`. This subagent loads no role contract and no knowledge: it calls only the operations of this template and `#capability:session-artifact-write`.
For the work item <WORK_ITEM_ID>, gather the information with the approved work item integration tools, which already return Markdown:
1. call `#capability:work-item-retrieval` with the work item id to get the title, the description, the URLs of the images, the acceptance criteria and the related work items;
2. call `#capability:work-item-comment-retrieval` with the work item id to get the comments;
3. for every id listed in the "Related Work Items" table, call `#capability:work-item-batch-retrieval` to resolve its title.

With `#capability:session-artifact-write`, attach to the session a new artifact named `work_item_<work item id>` with the Markdown returned by the tools, in this order:
- title
- description
- Images
- comments
- acceptance criteria
- related work items (with their id, title, and relation type)

then answer with the name of the artifact you created. Write the artifact once and do not read it back. The orchestrator that started you reads it and creates the plan.
```
