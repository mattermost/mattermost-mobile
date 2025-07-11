// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const platform = process.env.IOS === 'true' ? 'ios' : 'android';
const shard = process.env.CI_NODE_INDEX ? process.env.CI_NODE_INDEX : '';

module.exports = {
    setupFilesAfterEnv: ['./test/setup.ts'],
    maxWorkers: 1,
    testSequencer: './custom_sequencer.js',
    testTimeout: 180000,
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.e2e.ts'],
    transform: {
        '\.ts?$': 'ts-jest',
    },
    reporters: [
        'detox/runners/jest/reporter',
        ['jest-junit', {
            suiteName: 'Mobile App E2E with Detox and Jest',
            outputDirectory: './artifacts',
            outputName: `${platform}-junit${shard}.xml`,
            uniqueOutputName: false,
            addFileAttribute: true,
        }],
        ['jest-html-reporters', {
            pageTitle: 'Mobile App E2E with Detox and Jest',
            publicPath: './artifacts',
            filename: `${platform}-report${shard}.html`,
            expand: false,
        }],
        ['jest-stare', {
            reportHeadline: 'Mobile App E2E with Detox and Jest',
            resultDir: `./artifacts/${platform}-results${shard}/jest-stare`,
            resultJson: `${platform}-data.json`,
            resultHtml: `${platform}-main.html`,
            additionalResultsProcessors: ['./utils/jest_stare'],
            testResultsProcessor: './utils/jest_stare',
            pathBuilder: './utils/path_builder',
        }],
    ],
    globalSetup: 'detox/runners/jest/globalSetup',
    globalTeardown: 'detox/runners/jest/globalTeardown',
    testEnvironment: 'detox/runners/jest/testEnvironment',
    verbose: true,
    moduleNameMapper: {
        '^@support/(.*)': '<rootDir>/support/$1',
    },
};
