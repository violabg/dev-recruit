# Codebase clusters

Lab-authored contract. The captured server (3.0.1) partitions the files of one extension into PascalCase domain clusters with their sizes, with a `Tests` tier for the test infrastructure, a `General` tier for residual files and no `Uncategorized` bucket, but does not expose its algorithm. This deterministic algorithm reproduces that shape and is implemented in `runtime/lib/codebase.mjs`. The names it gives are not the server's: a cluster name is valid only inside the map that produced it.

## clusters

`#capability:codebase-clusters` — arguments `WorkspacePath` (also accepted as `workspacePath`; defaults to the workspace root), `fileExtension` (`.tsx` or `tsx`) and optional `matches` (a list of terms, or one comma-separated string).

1. List the workspace files with `git ls-files -co --exclude-standard`; outside git, walk the tree skipping `.git`, `node_modules`, `bin`, `obj`, `dist`, `build`, `coverage`, `.next` and `target`, and listing a symlink as an entry without descending into it.
2. Keep the files with the extension. Each extension is a separate map: `.ts` does not match `.tsx`.
3. A file is **test infrastructure** when one of its directories is `test`, `tests`, `__tests__`, `__mocks__`, `mocks`, `__fixtures__`, `fixtures`, `testing`, `test-utils`, `testUtils`, `e2e`, `cypress` or `playwright` (any case), or its base name is `setupTests`, `testUtils` (or hyphenated), `jest.setup`, `vitest.setup`, ends in `.mock` or `.fixture`, or ends in `Tests`. These files form `Tests`. A test beside its production file (`Order.test.tsx`) is not infrastructure: it stays with its domain.
4. Every other file joins the cluster of its **deepest directory that holds at least 5 of these files** (Lab-authored threshold), counted over its whole subtree. Structural directories never name a domain and are skipped: `src`, `source`, `sources`, `lib`, `app`, `apps`, `packages`, `modules`, `components`, `pages`, `features`, `common`, `shared`, `internal`, `pkg`, `main`, `java`, `kotlin`, `resources`. The cluster is named after the directory in PascalCase (`centralConstraints`, `central-constraints` → `CentralConstraints`), and directories with the same name in different places form one cluster.
5. A file with no such directory forms `General`.
6. Every file therefore belongs to exactly one cluster, and the sizes add up to the number of files.
7. Answer one line per cluster, largest first, then by name: `- <cluster> (<file count>)`.
8. With `matches` (captured on 3.0.4), the clusters that hold a match come first, each annotated `- <cluster> (<file count>) [match: <n>] <term>, <term>`: the seeds a caller already has point at the clusters to read. Lab-authored, the capture does not say what a match is: a term matches a cluster when a file of it carries the term in its workspace-relative path, ignoring case; `<n>` counts the matching terms, and the matched clusters keep the order of step 7 among themselves.

The list is a snapshot of the working tree: it changes when files change.

## cluster-files

`#capability:codebase-cluster-files` — arguments `WorkspacePath`, `fileExtension` and `clusterName`. Answer the absolute paths of the cluster's files, one per line, ordered case-insensitively. A listed path exists.

The name is matched exactly, case included. A name that is not in the current map answers `Cluster name '<name>' not found.` (as captured): re-read the map and pass a name it returned, never search the file system instead.
