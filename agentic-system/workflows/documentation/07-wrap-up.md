You are executing the documentation wrap-up. This is the terminal instruction.

---

**Steps**

1. Persist the final authored markdown as a session artifact with `#capability:session-artifact-write`: pass the session id, a descriptive artifact name (for example the documentation subject), a description, and the full markdown as the artifact content. Ensure the artifact name is non-empty: if it would be empty, derive a descriptive name from the documentation subject before persisting.
2. Confirm the artifact is retrievable with `#capability:session-artifact-read`.

---

**Rules**

1. **Artifact only.** The output is the filled markdown persisted as a session artifact. There is no external publishing.

2. **Report.** Report the artifact name and, when the template was flexible, the structural changes you recorded.

---

Send this exact message: "Documentation completed. Artifact: <artifact name>. Review it before proceeding."

Do not call `#capability:workflow-step-next` again after this wrap-up: the workflow of this job is complete.

This is the final instruction. After completing it, the workflow is complete.
