// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

beforeAll(async () => {
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
