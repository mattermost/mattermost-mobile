// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    AdvancedSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Advanced Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, and go to advanced settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await AdvancedSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on advanced settings screen
        await AdvancedSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await AdvancedSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5103_1 - should match elements on advanced settings screen', async () => {
        // * Verify basic elements on advanced settings screen
        await expect(AdvancedSettingsScreen.backButton).toBeVisible();
        await expect(AdvancedSettingsScreen.deleteDataOption).toBeVisible();
    });
});
