// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const path = require('path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Check if E2EE dev mode is enabled (symlinked to sister directory)
const e2eeSisterDir = path.resolve(__dirname, '../mattermost-mobile-e2ee');
const e2eeDevMarker = path.resolve(__dirname, '.e2ee-dev-mode');
const isE2EEDevMode = fs.existsSync(e2eeDevMarker) && fs.existsSync(e2eeSisterDir);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    watchFolders: isE2EEDevMode ? [e2eeSisterDir] : [],
    resolver: isE2EEDevMode ? {
        // Follow symlinks to their real locations
        unstable_enableSymlinks: true,
        // Ensure node_modules from symlinked dirs resolve to main node_modules
        nodeModulesPaths: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(e2eeSisterDir, 'node_modules'),
        ],
    } : {},
};

module.exports = mergeConfig(defaultConfig, config);
