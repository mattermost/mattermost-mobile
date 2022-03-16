// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

module.exports = {
    preset: 'react-native',
    verbose: true,
    globals: {
        'ts-jest': {
            tsConfigFile: 'tsconfig.json',
        },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    clearMocks: true,
    setupFilesAfterEnv: ['<rootDir>/e2e/test/setup.ts'],
    testPathIgnorePatterns: ['/node_modules/'],
    moduleNameMapper: {
        '@support/(.*)': '<rootDir>/e2e/support/$1',
    },
    moduleDirectories: [
        'node_modules',
        'e2e'
    ],
    transformIgnorePatterns: [
    ],
};
