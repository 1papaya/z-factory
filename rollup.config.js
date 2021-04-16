import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

// rollup won't tree shake these out for browser build
// so remove references to modules only used in node
const removeNodeModuleImports = replace({
  values: {
    'import * as path from "path"': "",
    'import * as fs from "fs"': "",
    'import fetch from "cross-fetch";': "",
  },
  preventAssignment: false,
  delimiters: ["", ""],
  exclude: /node_modules/,
});

const replacePlimitWithDefault = replace({
  values: {
    "const plimit = plimit_;": "const plimit = plimit_.default;",
  },
  preventAssignment: false,
  delimiters: ["", ""],
  exclude: /node_modules/,
});

const globals = {
  "p-limit": "plimit",
  "cross-fetch": "cross-fetch",
  "fast-png": "fastpng",
  path: "path",
  fs: "fs",
};

export default [
  // main bundle
  {
    input: "src/index.ts",
    output: {
      name: "z-factory",
      file: "dist/z-factory.js",
      format: "cjs",
      globals,
    },
    external: ["fast-png", "path", "fs", "p-limit", "cross-fetch"],
    plugins: [typescript()],
  },
  // browser bundle
  {
    input: "src/index.browser.ts",
    output: {
      name: "z-factory",
      file: "dist/z-factory.browser.js",
      format: "es",
      globals,
    },
    external: ["fast-png", "p-limit", "cross-fetch"],
    plugins: [removeNodeModuleImports, typescript()],
  },
  // module bundle
  {
    input: "src/index.ts",
    output: {
      name: "z-factory",
      file: "dist/z-factory.module.js",
      format: "es",
    },
    external: ["fast-png", "path", "fs", "p-limit", "cross-fetch"],
    plugins: [typescript()],
  },
  // standalone bundle
  {
    input: "src/index.browser.ts",
    output: [
      {
        name: "zfactory",
        file: "dist/z-factory.min.js",
        format: "iife",
      },
    ],
    context: "window",
    plugins: [
      removeNodeModuleImports,
      nodeResolve({ browser: true }),
      typescript(),
      commonjs(),
      replacePlimitWithDefault,
      terser(),
    ],
  },
];
