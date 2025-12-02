import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // ✅ React moderno: no es obligatorio importar React
      "react/react-in-jsx-scope": "off",

      // ✅ No queremos que truene por comentarios de hooks
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",

      // ✅ No queremos reescribir expresiones “suelta” del proyecto
      "@typescript-eslint/no-unused-expressions": "off",

      // ✅ Permitimos @ts-ignore para no romper código heredado
      "@typescript-eslint/ban-ts-comment": "off",

      // ✅ Permitimos any y variables sin usar (código heredado)
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // ✅ Reglas de estilo que solo generan ruido ahora
      "no-empty": "off",
      "prefer-const": "off",
      "no-useless-escape": "off",
    },
  }
);
