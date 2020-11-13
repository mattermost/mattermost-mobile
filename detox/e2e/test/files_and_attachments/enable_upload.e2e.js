// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {
    Setup,
    System,
} from '@support/server_api';

describe('Enable Upload', () => {
    beforeAll(async () => {
        // * Verify that the server has license
        await System.apiRequireLicense();

        // # Enable mobile upload
        await System.apiUpdateConfig({FileSettings: {EnableMobileUpload: true}});

        const {user} = await Setup.apiInit();
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3483 should enable file, image, camera icons when mobile file upload is enabled', async () => {
        // * Verify enabled file, image, camera icons are visible
        await expect(CameraQuickAction.cameraQuickAction).toBeVisible();
        await expect(FileQuickAction.fileQuickAction).toBeVisible();
        await expect(ImageQuickAction.imageQuickAction).toBeVisible();
    });
});
