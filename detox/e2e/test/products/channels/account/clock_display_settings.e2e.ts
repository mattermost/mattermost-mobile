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
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Clock Display Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open display settings screen, and go to clock display settings
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ClockDisplaySettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on clock display settings screen
        await ClockDisplaySettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await ClockDisplaySettingsScreen.back();
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5112_1 - should match elements on clock display settings screen', async () => {
        // * Verify basic elements on clock display settings screen
        await expect(ClockDisplaySettingsScreen.backButton).toBeVisible();
        await expect(ClockDisplaySettingsScreen.twelveHourOption).toBeVisible();
        await expect(ClockDisplaySettingsScreen.twentyFourHourOption).toBeVisible();
    });

    it('MM-T5112_2 - should be able to select a clock display and save by tapping navigation back button', async () => {
        // # Tap on a twenty four hour option and tap on back button
        await ClockDisplaySettingsScreen.twentyFourHourOption.tap();
        await ClockDisplaySettingsScreen.back();

        // * Verify on display settings screen and twenty four hour is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.clockDisplayOptionInfo).toHaveText('24-hour');

        // # Go back to clock display settings screen
        await ClockDisplaySettingsScreen.open();

        // * Verify twenty four option is selected
        await expect(ClockDisplaySettingsScreen.twentyFourHourOptionSelected).toBeVisible();

        // # Tap on twelve hour option and tap on back button
        await ClockDisplaySettingsScreen.twelveHourOption.tap();
        await ClockDisplaySettingsScreen.back();

        // * Verify on display settings screen and twelve hour is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.clockDisplayOptionInfo).toHaveText('12-hour');

        // # Go back to clock display settings screen
        await ClockDisplaySettingsScreen.open();

        // * Verify twelve hour option is selected
        await expect(ClockDisplaySettingsScreen.twelveHourOptionSelected).toBeVisible();
    });
});
