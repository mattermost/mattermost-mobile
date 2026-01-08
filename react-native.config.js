// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const path = require('path');

// Check if E2EE is available (dev mode symlink or binary mode)
const e2eeModulePath = path.resolve(__dirname, 'node_modules/@mattermost/e2ee');
const isE2EEAvailable = fs.existsSync(path.join(e2eeModulePath, 'package.json'));

module.exports = {
    dependencies: {
        'react-native-notifications': {
            platforms: {
                android: null,
            },
        },

        // Conditionally include e2ee if available
        ...(isE2EEAvailable && {
            '@mattermost/e2ee': {
                root: e2eeModulePath,
                platforms: {
                    android: {
                        sourceDir: path.join(e2eeModulePath, 'android'),
                        packageImportPath: 'import com.mattermost.e2ee.MattermostE2eePackage;',
                        packageInstance: 'new MattermostE2eePackage()',
                    },
                    ios: null, // iOS uses CocoaPods
                },
            },
        }),
    },
    assets: [
        './assets/fonts',
    ],
};
