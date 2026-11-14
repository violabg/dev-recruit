You are executing the documentation light coverage check: confirm the output has no residual placeholder and every required slot is resolved.

---

**Steps**

1. Call `#capability:documentation-check` with the template you used, the mode (`strict` or `flexible`), and the full authored markdown.
2. Read the verdict:
   - `Ok` when there is no residual placeholder and every required slot is resolved.
   - `Warnings` (flexible) when residual placeholders remain.
   - `Errors` (strict) when any residual placeholder remains; required slots are the priority.

---

**Rules**

1. **Strict mode.** In strict mode, any residual placeholder is an ERROR (required slots are the priority): fix the document and check again before continuing. Bound the recheck loop at three rounds; if a residual still remains after three rounds, stop, keep the recorded residual section, and continue to the review step.

2. **Flexible mode.** In flexible mode they are WARNINGS: resolve them or record why they remain.

3. **Emit the coverage trace:** placeholders total and resolved, required total and resolved, and the residual list.

---

**Output**

The coverage result and the actions taken.
