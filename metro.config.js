// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        blockList: [
            /.*\.test\.(js|jsx|ts|tsx)$/,
            /.*\.spec\.(js|jsx|ts|tsx)$/,
            /__tests__\/.*/,
            /__mocks__\/.*/,
        ],
    },
    transformer: {
        unstable_allowRequireContext: true,
    },
};

module.exports = mergeConfig(defaultConfig, config);
