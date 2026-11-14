// Locates the installed Bootstrap skill: its payload, client profiles, templates and version.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InstallError, readJson, readText } from "./util.mjs";

export function loadKit(root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")) {
  const changelog = readText(join(root, "CHANGELOG.md"));
  const version = changelog.match(/^## (\d+\.\d+\.\d+)/m)?.[1];
  if (!version) throw new InstallError(`${join(root, "CHANGELOG.md")} has no version heading`);
  return {
    root,
    version,
    payloadDir: join(root, "payload"),
    templatesDir: join(root, "templates"),
    index: readJson(join(root, "payload", "index.json")),
    profiles: readJson(join(root, "registry", "clients.json")).profiles,
  };
}
