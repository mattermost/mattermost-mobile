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
    ClockDisplaySettingsScreen,
    DisplaySettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
    ThemeDisplaySettingsScreen,
    TimezoneDisplaySettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Display Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, and go to display settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on display settings screen
        await DisplaySettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5102_1 - should match elements on display settings screen', async () => {
        // * Verify basic elements on display settings screen
        await expect(DisplaySettingsScreen.backButton).toBeVisible();
        await expect(DisplaySettingsScreen.themeOption).toBeVisible();
        await expect(DisplaySettingsScreen.clockDisplayOption).toBeVisible();
        await expect(DisplaySettingsScreen.timezoneOption).toBeVisible();
    });

    it('MM-T5102_2 - should be able to go to theme display settings screen', async () => {
        // # Tap on theme option
        await DisplaySettingsScreen.themeOption.tap();

        // * Verify on theme display settings screen
        await ThemeDisplaySettingsScreen.toBeVisible();

        // # Go back to display settings screen
        await ThemeDisplaySettingsScreen.back();
    });

    it('MM-T5102_3 - should be able to go to clock display settings screen', async () => {
        // # Tap on clock display option
        await DisplaySettingsScreen.clockDisplayOption.tap();

        // * Verify on clock display settings screen
        await ClockDisplaySettingsScreen.toBeVisible();

        // # Go back to display settings screen
        await ClockDisplaySettingsScreen.back();
    });

    it('MM-T5102_4 - should be able to go to timezone display settings screen', async () => {
        // # Tap on timezone option
        await DisplaySettingsScreen.timezoneOption.tap();

        // # Verify on timezone display settings screen
        await TimezoneDisplaySettingsScreen.toBeVisible();

        // # Go back to display settings screen
        await TimezoneDisplaySettingsScreen.back();
    });
});
