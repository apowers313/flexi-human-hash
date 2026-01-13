import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        ignores: [
            "node_modules/**",
            "coverage/**",
            "*.tgz",
            ".husky/**",
            "tmp/**",
        ],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2025,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }],
            "no-console": "off",
            "semi": ["error", "always"],
            "quotes": ["error", "double", { avoidEscape: true }],
            "indent": ["error", 4],
            "no-var": "error",
            "prefer-const": "error",
        },
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
        rules: {
            "no-unused-expressions": "off",
        },
    },
];
