You are executing the documentation intake: choose the documentation TEMPLATE and its MODE, then enumerate the template placeholders before any authoring.

---

**Steps**

1. Determine the subject of the documentation (the feature, process, endpoint or incident) and any optional source the user named.
2. Discover the available templates by calling `#capability:documentation-templates-list`. The result merges the templates under the user folder (the `{{USER_RUNTIME_ROOT}}/documentation/templates` folder), which includes the example templates shipped with the installation (named with the `example-` prefix), and the templates under the workspace folder (the `{{RUNTIME_ROOT}}/documentation/templates` folder of the workspace). People may use the examples or create their own templates in those folders; on a name clash the workspace wins over the user folder. Pass an extra templates folder only when the user points you to one. If the catalogue is empty (no template is discovered), do not proceed: ask the user for their own template file path, or, if the user names none, halt with an explicit message that no template is available.
3. Present the templates and ask which one to use. Ask for the MODE: `strict` (the template is a fixed contract) or `flexible` (the template is a starting point the author may adapt). Default to `flexible` when the user does not choose. If the user names a MODE value other than `strict` or `flexible`, re-ask once; if they still do not choose a recognised value, coerce it to `flexible` and say so explicitly.
4. Load the selected template with `#capability:documentation-template-read`.
5. Parse the template placeholders. A placeholder is a directive region opened by the sequence `(!#` and closed by the sequence `#!)`. It may span multiple lines. A directive may carry a metadata prefix `!#` followed by `slot:<id> | required:<true|false>` (case-insensitive). List every placeholder with its optional slot id and its required flag; an anonymous placeholder is treated as required. If the template declares no placeholder at all (directive-free), record that fact and choose: halt to have the template fixed, or proceed with an explicit note; a directive-free template is not a coverage gate.
6. If the user provides their own template file path instead of choosing from the catalogue, load it directly with `#capability:documentation-template-read` and skip the catalogue.

---

**Rules**

1. **Enumerate only.** Do not interpret and do not fill the directives in this step: only enumerate them.

2. **No research yet.** Do not explore the codebase and do not read project knowledge here; that happens later, driven by the directives.

---

**Output**

The selected template, its mode, and the enumerated placeholder list.
