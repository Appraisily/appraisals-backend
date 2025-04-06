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
    },
    // Add overrides for browser-specific files
    overrides: [
        {
            files: [
                'templates/**/*.js', // All JS files in templates directory
                'html_entity_decoder.js' // Specific file
            ],
            env: {
                browser: true, // Use browser environment for these files
                node: false // Disable Node.js environment
            },
            rules: {
                'no-undef': 'off', // Turn off no-undef for browser globals (like document)
                'import/no-unresolved': 'off', // Turn off import resolver for browser scripts
                'no-unused-vars': ['warn', { 'args': 'none' }] // Warn about unused vars, ignore args
            }
        }
    ]
}; 