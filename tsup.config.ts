import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["cjs", "esm"],
  dts: { entry: { index: "src/index.ts" } },
  clean: true,
  shims: true,
  banner: ({ format }) => {
    if (format === "esm") {
      return { js: "#!/usr/bin/env node" };
    }
    return {};
  },
});
