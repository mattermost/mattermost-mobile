// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Plugin, System, User} from '@support/server_api';

beforeAll(async () => {
    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth();
    await User.apiAdminLogin();
    await System.apiUpdateConfig();
    await Plugin.apiDisableNonPrepackagedPlugins();

    await device.launchApp({
        newInstance: false,
        launchArgs: {detoxPrintBusyIdleResources: 'YES'},
        permissions: {
            notifications: 'YES',
            camera: 'YES',
            medialibrary: 'YES',
            photos: 'YES',
        },
    });
});
