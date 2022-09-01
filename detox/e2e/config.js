// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const platform = process.env.IOS === 'true' ? 'ios' : 'android';

module.exports = {
    setupFilesAfterEnv: ['./test/setup.ts'],
    maxWorkers: 1,
    testEnvironment: './environment',
    testRunner: 'jest-circus/runner',
    testSequencer: './custom_sequencer.js',
    testTimeout: 120000,
    testRegex: '\\.e2e\\.ts$',
    transform: {
        '\\.ts?$': 'ts-jest',
    },
    reporters: [
        'detox/runners/jest/streamlineReporter',
        ['jest-junit', {
            suiteName: 'Mobile App E2E with Detox and Jest',
            outputDirectory: './artifacts',
            outputName: `${platform}-junit.xml`,
            uniqueOutputName: false,
        }],
        ['jest-html-reporters', {
            pageTitle: 'Mobile App E2E with Detox and Jest',
            publicPath: './artifacts',
            filename: `${platform}-report.html`,
            expand: false,
        }],
    ],
    verbose: true,
    moduleNameMapper: {
        '^@support/(.*)': '<rootDir>/support/$1',
    },
};
