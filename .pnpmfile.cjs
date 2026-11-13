// TypeScript 7 ships no JavaScript compiler API yet, so typescript-eslint
// (used by eslint-config-next) must keep using the TS 6 API side by side.
// See the TS 7.0 release notes, "Running side-by-side with TypeScript 6.0".
// The project itself (`tsc`, `next build`) uses TypeScript 7.
const TS6 = "npm:@typescript/typescript6@^6.0.2";

const needsTs6 = (name) =>
  name === "typescript-eslint" ||
  name === "ts-api-utils" ||
  name.startsWith("@typescript-eslint/");

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (needsTs6(pkg.name) && pkg.peerDependencies?.typescript) {
        delete pkg.peerDependencies.typescript;
        if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript;
        pkg.dependencies = { ...pkg.dependencies, typescript: TS6 };
      }
      return pkg;
    },
  },
};
