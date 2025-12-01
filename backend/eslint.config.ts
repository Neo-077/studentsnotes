import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    // Ignorar carpeta de build
    ignores: ["dist/**"],
    linterOptions: {
      // No queremos warnings por eslint-disable "inútiles"
      reportUnusedDisableDirectives: "off",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node, // entorno Node
      },
    },
    rules: {
      // 🔕 Mucho any en services y routes → no lo vamos a limpiar ahora
      "@typescript-eslint/no-explicit-any": "off",

      // 🔕 Proyecto grande con variables que a veces no se usan
      "@typescript-eslint/no-unused-vars": "off",

      // 🔕 Usas namespaces (auth/jwt), no los vamos a reescribir
      "@typescript-eslint/no-namespace": "off",

      // 🔕 Hay require() en utils/translate.ts
      "@typescript-eslint/no-require-imports": "off",

      // 🔕 Reglas de estilo que solo meten ruido
      "no-empty": "off",
      "no-useless-escape": "off",
    },
  }
);
