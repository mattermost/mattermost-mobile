// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Plugin, System, User} from '@support/server_api';
import testConfig from '@support/test_config';

beforeAll(async () => {
    // Login as sysadmin and reset server configuration
    const baseUrl = testConfig.siteUrl;
    await System.apiCheckSystemHealth(baseUrl);
    await User.apiAdminLogin(baseUrl);
    await System.apiUpdateConfig(baseUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(baseUrl);

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
