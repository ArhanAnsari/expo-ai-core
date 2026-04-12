import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  target: "es2020",
  external: [
    "react",
    "react-native",
    "expo-speech",
    "expo-av",
    "@react-native-async-storage/async-storage",
  ],
});
