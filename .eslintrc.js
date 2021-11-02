module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
    	"project": "./tsconfig.json"
    },
    ignorePatterns: [
        "*.hbs"
    ],
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "plugin:old-c-programmer/node",
    ],
    rules: {
    	"@typescript-eslint/no-floating-promises": "error"
    }
};
