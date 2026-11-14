# Local Markdown work items

This repository keeps its work items as Markdown files in this folder, one file per item. The work-item operations (`#capability:work-item-*`) read and write these files with the file tools; nothing else may change them.

## File

`<id>.md`, where `<id>` is the item id: `bug_<n>` or `us_<n>`, with `<n>` the next free number for that type. The id matches `^[A-Za-z0-9_]{1,100}$`, so a session can reuse it as its id.

```markdown
---
id: us_12
type: user-story        # user-story | bug
title: Export the order list as CSV
status: open            # open | in-progress | done
related: [bug_3]        # ids of explicitly linked items, optional
---

## Description
...

## Acceptance criteria
...

## Comments
- 2026-10-24 — <author>: <comment>
```

## Operations

| Operation | Procedure |
| --- | --- |
| `work-item-retrieval` | Read `<id>.md`. Answer its title, type, status, description, acceptance criteria and image links as Markdown. A missing file means the id does not exist. |
| `work-item-type-retrieval` | Read only the `type` field of `<id>.md`. |
| `work-item-batch-retrieval` | Read the title and type of every requested id; report each missing one. |
| `work-item-comment-retrieval` | Read the `## Comments` section of `<id>.md`. |
| `work-item-create` | Write a new `<id>.md` with the approved content and `status: open`. Never overwrite an existing file. |
| `work-item-update` | Change only the approved fields of `<id>.md` and append any approved comment. Never delete an item or a comment. |

Images are stored next to the item as `<id>-<n>.<ext>` and linked from its description.
