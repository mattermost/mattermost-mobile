// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const platform = process.env.IOS === 'true' ? 'ios' : 'android';
const shard = process.env.CI_NODE_INDEX ? process.env.CI_NODE_INDEX : '';
const parsedMaxWorkers = Number.parseInt(process.env.DETOX_MAX_WORKERS || '', 10);
const maxWorkers = Number.isNaN(parsedMaxWorkers) ? 1 : parsedMaxWorkers;

module.exports = {
    setupFilesAfterEnv: ['./test/setup.ts'],
    maxWorkers: process.env.CI ? 1 : maxWorkers,
    testSequencer: './custom_sequencer.js',
    testTimeout: process.env.LOW_BANDWIDTH_MODE === 'true' ? 300000 : 240000,
    forceExit: Boolean(process.env.CI),
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.e2e.ts'],
    transform: {
        '\\.ts?$': 'ts-jest',
    },
    reporters: [
        'detox/runners/jest/reporter',
        ['jest-junit', {
            suiteName: 'Mobile App E2E with Detox and Jest',
            outputDirectory: './artifacts',
            outputName: `${platform}-junit${shard}.xml`,
            uniqueOutputName: false,
        }],
        ['jest-stare', {
            reportHeadline: 'Mobile App E2E with Detox and Jest',
            resultDir: './artifacts/jest-stare',
            resultJson: `${platform}-data${shard}.json`,
            resultHtml: `${platform}-main${shard}.html`,
        }],
    ],
    globalSetup: './global_setup.js',
    globalTeardown: 'detox/runners/jest/globalTeardown',
    testEnvironment: 'detox/runners/jest/testEnvironment',
    verbose: true,
    moduleNameMapper: {
        '^@support/(.*)': '<rootDir>/support/$1',
    },
};
