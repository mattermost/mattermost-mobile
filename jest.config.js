// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line no-process-env
process.env.TZ = 'UTC';

module.exports = {
    preset: 'jest-expo',
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
    coverageReporters: ['lcov', 'text-summary', 'json-summary'],
    testPathIgnorePatterns: ['/node_modules/'],
    coveragePathIgnorePatterns: ['/node_modules/', '/components/', '/screens/'],
    transformIgnorePatterns: [
        'node_modules/(?!' +
        '(@react-native|react-native)|' +
        'expo-*|' +
        '@sentry/react-native|' +
        'validator|' +
        'hast-util-from-selector|hastscript|property-information|hast-util-parse-selector|space-separated-tokens|comma-separated-tokens|zwitch|' +
        '@mattermost/calls|@voximplant/react-native-foreground-service|' +
        '@rneui/base)',
    ],
    moduleNameMapper: {

        // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
        uuid: require.resolve('uuid'),
    },
};
