import { config } from "@blues-code/config-eslint/base"

export default [
    ...config,
    {
        languageOptions: {
            globals: {
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                global: "readonly",
                console: "readonly",
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
            },
        },
    },
]