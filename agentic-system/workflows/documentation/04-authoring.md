You are executing the documentation authoring: fill the template, replacing every placeholder directive with generated content.

---

**Rules**

1. **Directives are instructions, then removed.** Treat the content of a placeholder as an INSTRUCTION, not as text to keep. Interpret the directive, then REMOVE it: the whole region opened by the sequence `(!#` and closed by the sequence `#!)` is replaced by the generated content. If a directive or a required slot cannot be filled (no evidence and no knowledge), record it explicitly in place of the raw directive.

2. **Ground every statement.** Ground every statement in the codebase or in the project knowledge. State mechanisms, not claims.

3. **Honour the directive constraints.** Ordered lists, "table style", the requested number of lines, and any TONE (functional vs technical) are constraints you must respect.

4. **Keep the declared structure.** Keep the document structure the template declares.

5. **Flexible mode (default).** The template is a seed, not a contract: you MAY add, remove or reorder sections when the evidence justifies it, and you record every structural change (sections added, removed or reordered) so it can be reported in the wrap-up.

6. **Strict mode.** The structure is a contract: do not add, remove or reorder sections, and every required slot must be filled.

7. **No file references by default.** Do not include file names, paths or `file:line` references in the document: file names change and nothing keeps the document in sync. Include a reference only when the user explicitly asks for it.

---

**Output**

The filled markdown document.
