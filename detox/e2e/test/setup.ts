// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

beforeAll(async () => {
    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    await User.apiAdminLogin(siteOneUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);

    // Faster app launch
    await device.launchApp({
        newInstance: false,
        delete: false,
        launchArgs: {
            detoxPrintBusyIdleResources: 'YES',
            detoxDebugVisibility: 'YES',
            detoxDisableSynchronization: 'YES',
        },
        permissions: {
            notifications: 'YES',
            camera: 'NO',
            medialibrary: 'NO',
            photos: 'NO',
        },
    });

    // await device.launchApp({
    //     newInstance: false,
    //     delete: false,
    //     launchArgs: {
    //         detoxPrintBusyIdleResources: 'YES',
    //         detoxDebugVisibility: 'YES',
    //     },
    //     permissions: {
    //         notifications: 'YES',
    //         camera: 'YES',
    //         medialibrary: 'YES',
    //         photos: 'YES',
    //     },
    // });

    // await device.launchApp({
    //     newInstance: true,
    //     launchArgs: {
    //         detoxPrintBusyIdleResources: 'YES',
    //         detoxDebugVisibility: 'YES',
    //     },
    //     permissions: {
    //         notifications: 'YES',
    //         camera: 'YES',
    //         medialibrary: 'YES',
    //         photos: 'YES',
    //     },
    // });
});
