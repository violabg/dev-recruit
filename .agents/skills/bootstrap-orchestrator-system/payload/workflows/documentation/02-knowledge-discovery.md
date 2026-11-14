You are executing the documentation knowledge discovery: gather the project knowledge that grounds the documentation content.

---

**Knowledge Discovery**

1. Call `#capability:knowledge-catalog`.
2. Read every `MustHave` knowledge entry before any reasoning.
3. Use catalog metadata to identify applicable `PerContext` and `PerComponent` knowledge files for the request or artifact. When uncertain, read the file.
4. If reading a knowledge you catch a new concept that points to another knowledge file not yet read, read it. Knowledges can reference each other.
5. Do not skip any knowledge file because you believe you already know its contents.
6. **Do not explore the codebase in this step.** This step reads the project knowledge base only.

**CRITICAL: Maximize batch-reading.**
Do not call `#capability:knowledge-read` for a single file at a time: read all the files you need in one batch, and register their prescriptions in one batch. The server can handle large batches, and the round-trip time is significant.

**Knowledge discipline (binding).** Knowledge is binding and mandatory: it overrides common sense, best practice and the existing code. Use only the provided knowledge; never add external best practices, standards or inferred rules, and never invent a knowledge rule. Read every knowledge document in its entirety. Reconstruct from your own context what you already read and read only what is new, using `#capability:knowledge-read` to read the delta.

---

**Rules**

1. **No design artifact.** Do NOT call any `#capability:design-*` operation and do NOT create or modify any design artifact.

2. **Keep the sources.** Keep the list of knowledge sources you used; they are cited in the final document.

---

**Output**

The applicable knowledge entries and the facts each contributes to the documentation.
