// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

beforeAll(async () => {
    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    await User.apiAdminLogin(siteOneUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);

    await device.launchApp({
        newInstance: true,
        launchArgs: {detoxPrintBusyIdleResources: 'YES'},
        permissions: {
            notifications: 'YES',
            camera: 'YES',
            medialibrary: 'YES',
            photos: 'YES',
        },
    });
});
