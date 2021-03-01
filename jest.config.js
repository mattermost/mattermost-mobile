// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

module.exports = {
    preset: 'react-native',
    verbose: true,
    globals: {
        'ts-jest': {
            tsConfigFile: 'tsconfig.jest.json',
        },
    },
    clearMocks: true,
    setupFilesAfterEnv: [
        '<rootDir>/test/setup.js',
        '<rootDir>/node_modules/jest-enzyme/lib/index.js',
    ],
    collectCoverageFrom: [
        'app/**/*.{js,jsx,ts,tsx}',
    ],
    coverageReporters: [
        'lcov',
        'text-summary',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
    ],
    moduleNameMapper: {
        'assets/images/video_player/(.*).png': '<rootDir>/dist/assets/images/video_player/$1@2x.png',
    },
    transformIgnorePatterns: [
        'node_modules/(?!react-native|jail-monkey|@sentry/react-native|react-navigation|@react-native-community/cameraroll)',
    ],
};
