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
    AboutScreen,
    AccountScreen,
    AdvancedSettingsScreen,
    DisplaySettingsScreen,
    HomeScreen,
    NotificationSettingsScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, and go to settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on settings screen
        await SettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T4991_1 - should match elements on settings screen', async () => {
        // * Verify basic elements on settings screen
        await expect(SettingsScreen.notificationsOption).toBeVisible();
        await expect(SettingsScreen.displayOption).toBeVisible();
        await expect(SettingsScreen.advancedSettingsOption).toBeVisible();
        await expect(SettingsScreen.aboutOption).toBeVisible();
        await expect(SettingsScreen.helpOption).toBeVisible();
        await expect(SettingsScreen.reportProblemOption).toBeVisible();
    });

    it('MM-T4991_2 - should be able to go to notification settings screen', async () => {
        // # Tap on notifications option
        await SettingsScreen.notificationsOption.tap();

        // * Verify on notification settings screen
        await NotificationSettingsScreen.toBeVisible();

        // # Go back to settings screen
        await NotificationSettingsScreen.back();
    });

    it('MM-T4991_3 - should be able to go to display settings screen', async () => {
        // # Tap on display option
        await SettingsScreen.displayOption.tap();

        // * Verify on display settings screen
        await DisplaySettingsScreen.toBeVisible();

        // # Go back to settings screen
        await DisplaySettingsScreen.back();
    });

    it('MM-T4991_4 - should be able to go to advanced settings screen', async () => {
        // # Tap on advanced settings option
        await SettingsScreen.advancedSettingsOption.tap();

        // * Verify on advanced settings screen
        await AdvancedSettingsScreen.toBeVisible();

        // # Go back to settings screen
        await AdvancedSettingsScreen.back();
    });

    it('MM-T4991_5 - should be able to go to about screen', async () => {
        // # Tap on about option
        await SettingsScreen.aboutOption.tap();

        // * Verify on about screen
        await AboutScreen.toBeVisible();

        // # Go back to settings screen
        await AboutScreen.back();
    });
});
