// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

let isFirstLaunch = true;

beforeAll(async () => {
    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    await User.apiAdminLogin(siteOneUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);

    // Optimize app launch strategy
    if (isFirstLaunch) {
        // For first launch, clean install
        await device.launchApp({
            newInstance: true,
            delete: true,
            permissions: {

                // Set all permissions at once
                notifications: 'YES',
                camera: 'NO',
                medialibrary: 'NO',
                photos: 'NO',
            },
            launchArgs: {
                detoxPrintBusyIdleResources: 'YES',
                detoxDebugVisibility: 'YES',
                detoxDisableSynchronization: 'YES',
                detoxURLBlacklistRegex: '.*localhost.*', // Reduce network syncs
            },
        });
        isFirstLaunch = false;
    } else {
        // For subsequent launches, reuse instance
        await device.launchApp({
            newInstance: false,
            launchArgs: {
                detoxPrintBusyIdleResources: 'YES',
                detoxDebugVisibility: 'YES',
                detoxDisableSynchronization: 'YES',
                detoxURLBlacklistRegex: '.*localhost.*',
            },
        });
    }
});

// Add this to speed up test cleanup
afterAll(async () => {
    await device.sendToHome();
});
