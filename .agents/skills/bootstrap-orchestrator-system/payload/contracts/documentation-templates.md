# Documentation templates

Lab-authored contract, derived from the captured documentation tools. The runtime implements it in `runtime/lib/documentation.mjs`.

A template is a markdown skeleton. Its directives are regions opened by `(!#` and closed by `#!)`; a directive may span lines and may start with a slot header `!# slot:<id> | required:<true|false>` (case-insensitive). A directive without a header is required. A template may declare `mode: strict` in front matter; otherwise its mode is `flexible`.

- `strict` — the template is a fixed contract: keep its structure and fill every required slot.
- `flexible` (default) — the template is a starting point: sections may be added, removed or reordered, and every structural change is recorded.

The shipped examples are `example-api-contract`, `example-process` and `example-troubleshooting-incident` (`templates/documentation/`).

## discovery

`#capability:documentation-templates-list` — optional argument `templatesDirectory`. Merge the templates of, from lowest to highest precedence:

1. the user folder `{{USER_RUNTIME_ROOT}}/documentation/templates` (where the shipped examples are installed),
2. the workspace folder `{{RUNTIME_ROOT}}/documentation/templates`,
3. the extra folder, when given.

On a name clash the higher folder wins. Answer a JSON array sorted by name:

```json
[ { "name": "example-process", "mode": "flexible", "source": "example", "path": "<absolute path>",
    "description": "(!# name of the feature/process #!)" } ]
```

`source` is `example` for a name starting with `example-`, otherwise the folder (`user`, `workspace`, `extra`). `description` is the template's first directive.

`#capability:documentation-template-read` — argument `templateNameOrPath`: a template name resolved through the folders above, or a file path. Answer the template verbatim.

## check

`#capability:documentation-check` — arguments `templateNameOrPath`, `outputContent` (or `outputFile`), `mode` (`strict` or `flexible`; anything else is `flexible`).

A template directive is resolved when no directive with the same text remains in the output. Answer:

```json
{ "mode": "flexible", "placeholders_total": 10, "placeholders_resolved": 10, "coverage": 1,
  "required_total": 10, "required_resolved": 10, "required_coverage": 1,
  "residual_count": 0, "verdict": "Ok", "residuals": [],
  "messages": ["No residual placeholder remains in the output."] }
```

`verdict` is `Ok` when no directive remains and every required directive is resolved; otherwise `Errors` in strict mode and `Warnings` in flexible mode. Each residual reports its slot, required flag, text and line.
