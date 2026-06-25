import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**", "next-env.d.ts", "../../packages/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
