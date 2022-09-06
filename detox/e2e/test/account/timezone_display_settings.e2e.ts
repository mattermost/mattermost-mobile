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
    SelectTimezoneScreen,
    ServerScreen,
    SettingsScreen,
    TimezoneDisplaySettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Timezone Display Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open display settings screen, and go to timezone display settings
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await TimezoneDisplaySettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on timezone display settings screen
        await TimezoneDisplaySettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await TimezoneDisplaySettingsScreen.back();
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5113_1 - should match elements on timezone display settings screen', async () => {
        // * Verify basic elements on timezone display settings screen
        await expect(TimezoneDisplaySettingsScreen.backButton).toBeVisible();
        await expect(TimezoneDisplaySettingsScreen.automaticOptionToggledOn).toBeVisible();
    });

    it('MM-T5113_2 - should be able to select a timezone and save by tapping navigation back button', async () => {
        // # Toggle automatic option off and tap on manual option
        await TimezoneDisplaySettingsScreen.toggleAutomaticOptionOff();
        await TimezoneDisplaySettingsScreen.manualOption.tap();

        // * Verify on select timezone screen
        await SelectTimezoneScreen.toBeVisible();

        // # Search for a timezone and tap on a timezone
        await SelectTimezoneScreen.searchInput.replaceText('Africa');
        await SelectTimezoneScreen.getNonSelectedTimezoneRow('Africa/Nairobi').tap();

        // * Verify on timezone display settings screen and timezone is set
        await TimezoneDisplaySettingsScreen.toBeVisible();
        await expect(TimezoneDisplaySettingsScreen.manualOptionInfo).toHaveText('Nairobi');

        // # Tap on back button
        await TimezoneDisplaySettingsScreen.back();

        // * Verify on display settings screen and manual is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.timezoneOptionInfo).toHaveText('Manual');

        // # Go back to timezone display settings screen, toggle automatic option on and tap on back button
        await TimezoneDisplaySettingsScreen.open();
        await TimezoneDisplaySettingsScreen.toggleAutomaticOptionOn();
        await TimezoneDisplaySettingsScreen.back();

        // * Verify on display settings and auto is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.timezoneOptionInfo).toHaveText('Auto');

        // # Go back to timezone display settings screen
        await TimezoneDisplaySettingsScreen.open();
    });
});
