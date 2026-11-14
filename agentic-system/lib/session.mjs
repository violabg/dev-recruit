// Session store: one folder per session under the sessions root (contracts/session-store.md).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join, resolve } from "node:path";
import {
  arg,
  ARTIFACT_PATTERN,
  frontmatter,
  iso,
  linedJson,
  parseFrontmatter,
  readJson,
  requireId,
  requireString,
  RuntimeError,
  withLock,
  writeJson,
  writeText,
} from "./util.mjs";

const USAGE_INSTRUCTION =
  "Start from now you have a long term memory and a logger.Read memory at startup and before critical decisions. Write validated data, agent reasoning, and reusable artifacts.Use the logger to record actions, decisions, errors, and key events. Log consistently for traceability and debugging.";

function sessionDir(ctx, sessionId) {
  return join(ctx.sessionsRoot, sessionId);
}

export function requireSession(ctx, sessionId, tool) {
  requireId(sessionId, "sessionId", tool);
  const dir = sessionDir(ctx, sessionId);
  if (!existsSync(join(dir, "session.json"))) {
    throw new RuntimeError(`${tool} failed: session '${sessionId}' does not exist. Activate it first with session-activate.`);
  }
  return dir;
}

function sessionsByRecency(ctx) {
  if (!existsSync(ctx.sessionsRoot)) return [];
  return readdirSync(ctx.sessionsRoot)
    .filter((name) => existsSync(join(ctx.sessionsRoot, name, "session.json")))
    .map((name) => ({ name, at: readJson(join(ctx.sessionsRoot, name, "session.json"), {}).lastActivatedAt ?? "" }))
    .sort((a, b) => (b.at > a.at ? 1 : b.at < a.at ? -1 : a.name.localeCompare(b.name)));
}

const KNOWLEDGE_READS_FILE = "knowledge-reads.json";

// Records the knowledge documents (by path: file ids change on rebuild) served in a session: the session
// named in the call, or else the most recently activated one. Without any session nothing is recorded.
export function recordKnowledgeReads(ctx, sessionId, paths) {
  const id = sessionId && existsSync(join(sessionDir(ctx, sessionId), "session.json")) ? sessionId : sessionsByRecency(ctx)[0]?.name;
  if (!id) return;
  const file = join(sessionDir(ctx, id), KNOWLEDGE_READS_FILE);
  // Parts are requested in parallel, so two processes may record at once: neither may lose the other's read.
  withLock(`${file}.lock`, () => writeJson(file, [...new Set([...readJson(file, []), ...paths])].sort()));
}

export function knowledgeReads(ctx, sessionId) {
  return readJson(join(sessionDir(ctx, sessionId), KNOWLEDGE_READS_FILE), []);
}

export function sessionList(ctx) {
  const ids = sessionsByRecency(ctx);
  if (ids.length === 0) return "No sessions available.";
  return `Available sessions (most recent first):\n${ids.map((s) => `- ${s.name}`).join("\n")}`;
}

export function sessionActivate(ctx, args) {
  const sessionId = requireId(arg(args, "sessionId"), "sessionId", "session-activate");
  const dir = sessionDir(ctx, sessionId);
  const now = iso(ctx.now());
  const existing = readJson(join(dir, "session.json"), null);
  mkdirSync(join(dir, "artifacts"), { recursive: true });
  writeJson(join(dir, "session.json"), { sessionId, createdAt: existing?.createdAt ?? now, lastActivatedAt: now });
  for (const [file, initial] of [
    ["memory.md", ""],
    ["log.md", ""],
  ]) {
    if (!existsSync(join(dir, file))) writeFileSync(join(dir, file), initial);
  }
  const state = existing ? `resumed (created ${existing.createdAt})` : "";
  return `session_id: ${sessionId}\ncurrent_state: ${state}\nusage_instruction: ${USAGE_INSTRUCTION}`;
}

function textOf(args, names) {
  for (const name of names) {
    const value = arg(args, name);
    if (typeof value === "string" && value.trim()) return value;
  }
  const rest = { ...args };
  delete rest.sessionId;
  return Object.keys(rest).length ? JSON.stringify(rest) : "";
}

export function memoryAppend(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-memory-append");
  const text = requireString(textOf(args, ["content", "memory", "text", "entry"]), "content", "session-memory-append");
  const path = join(dir, "memory.md");
  const prefix = readFileSync(path, "utf8").length ? "\n" : "";
  writeFileSync(path, readFileSync(path, "utf8") + `${prefix}- [${iso(ctx.now())}] ${text.trim()}\n`);
  return "Content appended successfully.";
}

export function eventLog(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-event-log");
  const text = requireString(textOf(args, ["event", "message", "content", "text", "entry"]), "event", "session-event-log");
  const level = arg(args, "level") ?? arg(args, "type") ?? "info";
  const path = join(dir, "log.md");
  writeFileSync(path, readFileSync(path, "utf8") + `- [${iso(ctx.now())}] ${level}: ${text.trim()}\n`);
  return "Log entry added successfully.";
}

function artifactsDir(dir) {
  return join(dir, "artifacts");
}

function readArtifactMeta(dir, name) {
  const path = join(artifactsDir(dir), `${name}.md`);
  if (!existsSync(path)) return null;
  const { data, body } = parseFrontmatter(readFileSync(path, "utf8"));
  return { name, ...data, body, path };
}

function listArtifacts(dir) {
  if (!existsSync(artifactsDir(dir))) return [];
  return readdirSync(artifactsDir(dir))
    .filter((file) => file.endsWith(".md"))
    .map((file) => readArtifactMeta(dir, file.slice(0, -3)))
    .filter(Boolean)
    .map(({ body, path, ...meta }) => meta)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function memoryRead(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-memory-read");
  const memory = readFileSync(join(dir, "memory.md"), "utf8").trim();
  const artifacts = listArtifacts(dir);
  const lines = artifacts.map(
    (a) => `- Artifact Name: ${a.name} | Intended Use: ${a.intendedUse ?? ""} | Description: ${a.description ?? ""}`,
  );
  return `${memory || "(memory is empty)"}\n\n# Agent Artifacts\n${lines.length ? lines.join("\n") : "(no artifacts)"}`;
}

function frontMatterArgs(args) {
  const fm = arg(args, "artifactFrontMatter") ?? {};
  const pick = (name, ...aliases) => {
    for (const key of [name, ...aliases]) {
      const value = arg(fm, key) ?? arg(args, key);
      if (value !== undefined) return value;
    }
    return undefined;
  };
  return {
    name: pick("name", "artifactName"),
    description: pick("description"),
    intendedUse: pick("intendedUse", "intended_use", "use"),
    mimeType: pick("mimeType", "mime_type"),
    origin: pick("origin"),
  };
}

function requireArtifactName(name, tool) {
  requireString(name, "name", tool);
  if (!ARTIFACT_PATTERN.test(name)) {
    throw new RuntimeError(`${tool} failed: artifact name contains unsupported characters. Allowed format: ^[A-Za-z0-9_.-]{1,150}$. Provided value: '${name}'.`);
  }
  return name;
}

// Every artifact is stored as `<name>.md` (contracts/session-store.md), so a name that already ends in `.md`
// drops it: `work_item_1.md` is the artifact `work_item_1`, not `work_item_1.md.md`. The name written is returned.
function dropMarkdownSuffix(name) {
  return typeof name === "string" ? name.replace(/(?<=.)\.md$/, "") : name;
}

export function artifactWrite(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-artifact-write");
  const meta = frontMatterArgs(args);
  const name = requireArtifactName(dropMarkdownSuffix(meta.name), "session-artifact-write");
  let content = arg(args, "content");
  const contentFile = arg(args, "contentFile");
  if (content === undefined && contentFile) content = readFileSync(resolve(ctx.workspaceRoot, contentFile), "utf8");
  if (typeof content !== "string") throw new RuntimeError("session-artifact-write failed: 'content' is required.");
  const existing = readArtifactMeta(dir, name);
  const header = frontmatter({
    name,
    description: meta.description,
    intendedUse: meta.intendedUse,
    mimeType: meta.mimeType ?? "text/markdown",
    origin: meta.origin,
    createdAt: existing?.createdAt ?? iso(ctx.now()),
    updatedAt: iso(ctx.now()),
  });
  writeText(join(artifactsDir(dir), `${name}.md`), header + content + (content.endsWith("\n") ? "" : "\n"));
  return name;
}

export function artifactRead(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-artifact-read");
  const name = requireArtifactName(arg(args, "name") ?? arg(args, "artifactName") ?? arg(args, "artifactId") ?? arg(args, "artifact"), "session-artifact-read");
  const meta = readArtifactMeta(dir, name);
  if (!meta) throw new RuntimeError(`session-artifact-read failed: artifact '${name}' does not exist in session.`);
  return readFileSync(meta.path, "utf8");
}

export function readArtifactBody(ctx, sessionId, name) {
  const meta = readArtifactMeta(sessionDir(ctx, sessionId), name);
  return meta ? meta.body : null;
}

export function artifactList(ctx, args) {
  const dir = requireSession(ctx, arg(args, "sessionId"), "session-artifact-list");
  return linedJson(listArtifacts(dir));
}

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

export async function imageAttach(ctx, args) {
  const tool = "session-image-attach";
  const dir = requireSession(ctx, arg(args, "sessionId"), tool);
  const meta = frontMatterArgs(args);
  const name = requireArtifactName(meta.name, tool);
  const blobUrl = requireString(arg(args, "blobUrl"), "blobUrl", tool);
  let bytes;
  let extension;
  let mimeType;
  if (/^https?:\/\//i.test(blobUrl)) {
    let response;
    try {
      response = await fetch(blobUrl);
    } catch (error) {
      throw new RuntimeError(`${tool} failed: the image URL is not reachable: ${blobUrl} (${error.message})`);
    }
    if (!response.ok) throw new RuntimeError(`${tool} failed: the image URL returned HTTP ${response.status}: ${blobUrl}`);
    mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!mimeType.startsWith("image/")) {
      throw new RuntimeError(`${tool} failed: the URL does not return an image (content-type '${mimeType || "unknown"}'): ${blobUrl}`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
    extension = Object.entries(IMAGE_TYPES).find(([, type]) => type === mimeType)?.[0] ?? extname(new URL(blobUrl).pathname) ?? ".img";
  } else {
    const path = isAbsolute(blobUrl) ? blobUrl : resolve(ctx.workspaceRoot, blobUrl);
    if (!existsSync(path) || !statSync(path).isFile()) throw new RuntimeError(`${tool} failed: the image file is not readable: ${path}`);
    extension = extname(path).toLowerCase();
    mimeType = IMAGE_TYPES[extension];
    if (!mimeType) throw new RuntimeError(`${tool} failed: unsupported image type '${extension}': ${path}`);
    bytes = null;
    mkdirSync(artifactsDir(dir), { recursive: true });
    copyFileSync(path, join(artifactsDir(dir), `${name}${extension}`));
  }
  const file = join(artifactsDir(dir), `${name}${extension}`);
  if (bytes) writeFileSync(file, bytes);
  writeText(
    join(artifactsDir(dir), `${name}.md`),
    frontmatter({
      name,
      description: meta.description,
      intendedUse: meta.intendedUse,
      mimeType,
      origin: meta.origin,
      source: blobUrl,
      file,
      createdAt: iso(ctx.now()),
    }) + `Image artifact. File: ${file}\n`,
  );
  return `Image attached as session artifact '${name}'. File: ${file}`;
}
