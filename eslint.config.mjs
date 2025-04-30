import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import unicornPlugin from "eslint-plugin-unicorn";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            unicorn: unicornPlugin,
        },
        rules: {
            "noInlineConfig": true,
            "reportUnusedDisableDirectives": true,

            "@typescript-eslint/consistent-type-assertions": [
                "error",
                { "assertionStyle": "never" }
            ],
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                { "accessibility": "explicit", "overrides": { "constructors": "off" } }
            ],
            "@typescript-eslint/member-ordering": "error",
            "class-methods-use-this": "error",

            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "unicorn/no-array-callback-reference": "off",
            "unicorn/no-array-for-each": "off",
            "unicorn/no-array-reduce": "off",
            "unicorn/no-null": "off",
            "unicorn/number-literal-case": "off",
            "unicorn/numeric-separators-style": "off",
            "unicorn/prevent-abbreviations": [
                "error",
                {
                    "allowList": {
                        "acc": true,
                        "env": true,
                        "i": true,
                        "j": true,
                        "props": true,
                        "Props": true
                    }
                }
            ]
        },
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: "."
            }
        }
    },
    {
        ...unicornPlugin.configs.recommended,
    }
];
