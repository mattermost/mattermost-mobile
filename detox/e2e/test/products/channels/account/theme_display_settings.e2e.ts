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
    DisplaySettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
    ThemeDisplaySettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Theme Display Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open display settings screen, and go to theme display settings
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on theme display settings screen
        await ThemeDisplaySettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await ThemeDisplaySettingsScreen.back();
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5111_1 - should match elements on theme display settings screen', async () => {
        // * Verify basic elements on theme display settings screen
        await expect(ThemeDisplaySettingsScreen.backButton).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.denimOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.sapphireOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.quartzOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.indigoOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.onyxOption).toBeVisible();
    });

    it('MM-T5111_2 - should be able to select a theme and save by tapping navigation back button', async () => {
        // # Tap on a sapphire option and tap on back button
        await ThemeDisplaySettingsScreen.sapphireOption.tap();

        // * Verify on display settings screen and sapphire is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Sapphire');

        // # Go back to theme display settings screen
        await ThemeDisplaySettingsScreen.open();

        // * Verify sapphire option is selected
        await expect(ThemeDisplaySettingsScreen.sapphireOptionSelected).toBeVisible();

        // # Tap on denim option and tap on back button
        await ThemeDisplaySettingsScreen.denimOption.tap();

        // * Verify on display settings screen and denim is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Go back to theme display settings screen
        await ThemeDisplaySettingsScreen.open();

        // * Verify denim option is selected
        await expect(ThemeDisplaySettingsScreen.denimOptionSelected).toBeVisible();
    });
});
