import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                module: "readonly",
                process: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly"
            }
        },
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "curly": "warn",
            "eqeqeq": "warn",
            "no-throw-literal": "warn",
            "semi": "off",
            "@stylistic/semi": "warn",
            "no-unused-vars": "warn"
        },
    }
];
