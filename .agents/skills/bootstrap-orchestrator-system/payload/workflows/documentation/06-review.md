You are executing the documentation review: an adversarial pass over the produced guide, carried out by a dedicated reviewer subagent that reads it, finds the unclear sections and fixes them.

---

**Steps**

1. Determine the `entry point` from which the documentation starts — the endpoint, route, class or component the subject begins at — from the exploration evidence. Do not ask the user. If the entry point cannot be derived, proceed with an explicitly documented entry point or halt; never ask the user.
2. Write the full authored markdown to a file inside the workspace — not under the user session folder and not in a system temp folder — for example `{{RUNTIME_ROOT}}/documentation/<name>.md`, and keep its absolute path. Writing it inside the workspace lets the reviewer read and edit it without extra read authorizations. This file is the guide the reviewer reads and edits.
3. Invoke the subagent `documentation-reviewer` with the `#capability:delegate` tool (`role`: `documentation-reviewer`) with this prompt, replacing only the placeholders:

   ```
   Documentation path: <the absolute path of the temporary markdown file>
   Entry point: <the entry point>
   ```

   Use that prompt verbatim; add nothing else. The reviewer reads the guide at the given path, judges its effectiveness adversarially and fixes the unclear sections directly in the file.
4. After the subagent completes, re-read the file and take its content as the reviewed guide.

---

**Rules**

1. **The review must change the guide.** The reviewer fixes the sections it finds unclear, ambiguous, incomplete or misleading.

2. **No file references by default.** The reviewed guide must not cite file names or paths unless the user explicitly asked for them.

3. **Bounded rounds.** If the reviewer reports a section it could not fix, resolve it and re-invoke the reviewer; at most three rounds. After three rounds, proceed to the wrap-up with the unfixed section recorded, or halt if the unfixed section blocks the guide.

---

**Output**

The reviewed markdown guide and the reviewer's report. The reviewer's report is structured as: `changed` (the sections it edited), `unfixable` (the sections it could not fix, each with a reason), and `verdict` (`ok` or `needs-work`).
