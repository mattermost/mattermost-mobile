// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

module.exports = {
    preset: 'react-native',
    verbose: true,
    globals: {
        'ts-jest': {
            tsConfigFile: 'tsconfig.test.json',
        },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    clearMocks: true,
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    collectCoverageFrom: ['app/**/*.{js,jsx,ts,tsx}'],
    coverageReporters: ['lcov', 'text-summary'],
    testPathIgnorePatterns: ['/node_modules/'],
    transform: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/test/file_transformer.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@react-native|react-native)|jail-monkey|@sentry/react-native|react-clone-referenced-element|@react-native-community|react-navigation|@react-navigation/.*|validator|react-syntax-highlighter/.*|hast-util-from-selector|hastscript|property-information|hast-util-parse-selector|space-separated-tokens|comma-separated-tokens|zwitch|@mattermost/calls|@voximplant/react-native-foreground-service)',
    ],
    moduleNameMapper: {

        // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
        uuid: require.resolve('uuid'),
    },
};
