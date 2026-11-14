---
applyTo: "{{RUNTIME_ROOT}}/**"
---

# Session Store Rules

The session store is owned by the agentic system runtime (`{{SESSIONS_ROOT}}/`). Its layout and operations are defined by the session-store, workflow-loop and design-model contracts.

- Session ids and job ids match `^[A-Za-z0-9_]{1,100}$`. A session is created or resumed only on the developer's explicit request; never activate one because its name matches the request.
- Work only inside the active session. Listing sessions is for the developer to choose from; never read another session's memory, log, artifacts, jobs or designs.
- Write through the runtime operations, never with file tools: memory with `#capability:session-memory-append`, events with `#capability:session-event-log`, artifacts with `#capability:session-artifact-write`, images with `#capability:session-image-attach`.
- An artifact is updated by writing the same name again. Memory holds a pointer to an artifact, never a copy of it.
- `design.json`, `jobs/*.json` and `design.integrity.json` change only through runtime operations. A manual edit of `design.json` is refused by every design operation until it is reverted or reviewed and re-sealed.
- `design.html`, `snapshot.md` and `verification-view.md` are views regenerated on every design write; never edit them.
- When the runtime is unavailable, follow the contract procedures by hand and record in the session memory that the gates ran instruction-only.
