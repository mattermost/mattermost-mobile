// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line no-process-env
const intuneEnabled = process.env.INTUNE_ENABLED === '1';

const dependencies = {
    'react-native-notifications': {
        platforms: {
            android: null,
        },
    },
};

// Conditionally add Intune dependency when enabled
if (intuneEnabled) {
    dependencies['@mattermost/intune'] = {
        root: './libraries/@mattermost/intune',
    };
}

module.exports = {
    dependencies,
    assets: [
        './assets/fonts',
    ],
};
