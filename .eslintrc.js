module.exports = {
    env: {
        commonjs: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:import/recommended' // Enable import plugin rules
    ],
    parserOptions: {
        ecmaVersion: 12,
    },
    plugins: [
        'import' // Declare the import plugin
    ],
    rules: {
        'import/no-unresolved': [2, { commonjs: true, amd: false }], // Ensure requires are resolvable
        // Add any other project-specific rules here
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js'] // Define the extensions to resolve
            }
        }
    }
}; 