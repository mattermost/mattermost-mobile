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
    coveragePathIgnorePatterns: ['/node_modules/', '/components/', '/screens/', '/routes/'],
    transformIgnorePatterns: [
        'node_modules/(?!' +
        '(@react-native|react-native)|' +
        'expo(?:-[^/]+)?|@expo|expo-modules-core|uuid|' +
        '@sentry/react-native|' +
        'react-intl|@formatjs/[^/]+|intl-messageformat|@messageformat/[^/]+|' +
        'validator|' +
        'hast-util-from-selector|hastscript|property-information|hast-util-parse-selector|space-separated-tokens|comma-separated-tokens|zwitch|' +
        '@mattermost/calls|@mattermost/rnutils|@mattermost/hardware-keyboard|@mattermost/rnshare|@mattermost/secure-pdf-viewer|@mattermost/compass-icons|@voximplant/react-native-foreground-service|' +
        '@rneui/base|' +
        '@shopify/flash-list|' +
        'ratex-react-native)',
    ],
};
