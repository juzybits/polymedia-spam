module.exports = {
    root: true,
    env: {},
    ignorePatterns: ["dist", "node_modules"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: [ "./tsconfig.json" ],
        tsconfigRootDir: __dirname,
    },
    plugins: [
        "@stylistic",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/strict-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
    ],
    rules: {
        "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
        "@stylistic/member-delimiter-style": [ "error", { "multiline": { "delimiter": "semi" }, "singleline": { "delimiter": "semi" } } ],
        "@stylistic/quotes": [ "error", "double", { "avoidEscape": true } ],
        "@stylistic/semi": [ "error", "always" ],
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        "@typescript-eslint/no-confusing-void-expression": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/prefer-nullish-coalescing": [ "error", { "ignoreConditionalTests": true, "ignoreMixedLogicalExpressions": true } ],
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
        "no-constant-condition": "off",
    },
    overrides: [
        {
            files: ["src/cli/**/*"],
            env: { node: true },
        },
        {
            files: ["src/react/**/*", "src/web/**/*"],
            env: { browser: true },
            plugins: ["react-refresh"],
            extends: [
                "plugin:react-hooks/recommended",
                "plugin:react/jsx-runtime",
                "plugin:react/recommended",
            ],
            rules: {
                "react-hooks/exhaustive-deps": "off",
                "react/no-unescaped-entities": "off",
                "react/prop-types": "off",
                "react/react-in-jsx-scope": "off",
            },
            settings: {
                react: {
                    version: "detect"
                }
            },
        },
    ],
};
