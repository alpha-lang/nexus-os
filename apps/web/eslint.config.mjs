import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ─── TypeScript : trop strict pour le code existant ─────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",

      // ─── React 19 : nouvelles règles trop zélées ────────────────
      // (fetch + setLoading dans useEffect = pattern légitime)
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "warn",

      // ─── Next 16 ────────────────────────────────────────────────
      // TODO: migrer les <a href> vers <Link> dans une PR dédiée
      "@next/next/no-html-link-for-pages": "off",

      // ─── UI : apostrophes françaises partout ────────────────────
      "react/no-unescaped-entities": "off",

      // ─── Divers ─────────────────────────────────────────────────
      "import/no-anonymous-default-export": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
