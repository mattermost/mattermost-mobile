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
    EmailNotificationSettingsScreen,
    HomeScreen,
    LoginScreen,
    NotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Email Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open notification settings screen, and go to email notification settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
        await EmailNotificationSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on email notification settings screen
        await EmailNotificationSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await EmailNotificationSettingsScreen.back();
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5109_1 - should match elements on email notification settings screen', async () => {
        // * Verify basic elements on email notification settings screen
        await expect(EmailNotificationSettingsScreen.backButton).toBeVisible();
        await expect(EmailNotificationSettingsScreen.immediatelyOption).toBeVisible();
        await expect(EmailNotificationSettingsScreen.neverOption).toBeVisible();
        await expect(EmailNotificationSettingsScreen.emailThreadsOptionToggledOn).toBeVisible();
    });

    it('MM-T5109_2 - should be able to change email notification settings and save by tapping navigation back button', async () => {
        // # Tap on never option
        await EmailNotificationSettingsScreen.neverOption.tap();

        // * Verify email threads option does not exist
        await expect(EmailNotificationSettingsScreen.emailThreadsOptionToggledOn).not.toExist();

        // # Tap on back button
        await EmailNotificationSettingsScreen.back();

        // * Verify on notification settings screen and never is set
        await NotificationSettingsScreen.toBeVisible();
        await expect(NotificationSettingsScreen.emailNotificationsOptionInfo).toHaveText('Never');

        // # Go back to email notification settings screen
        await EmailNotificationSettingsScreen.open();

        // * Verify never option is selected
        await expect(EmailNotificationSettingsScreen.neverOptionSelected).toBeVisible();

        // # Tap on immediately option, toggle email threads option off, and tap on back button
        await EmailNotificationSettingsScreen.immediatelyOption.tap();
        await EmailNotificationSettingsScreen.toggleEmailThreadsOptionOff();
        await EmailNotificationSettingsScreen.back();

        // * Verify on notification settings screen and immediately is set
        await NotificationSettingsScreen.toBeVisible();
        await expect(NotificationSettingsScreen.emailNotificationsOptionInfo).toHaveText('Immediately');

        // # Go back to email notification settings screen
        await EmailNotificationSettingsScreen.open();

        // * Verify immediately option is selected and email thread option is toggled off
        await expect(EmailNotificationSettingsScreen.immediatelyOptionSelected).toBeVisible();
        await expect(EmailNotificationSettingsScreen.emailThreadsOptionToggledOff).toBeVisible();

        // # Toggle email threads option off, tap on back button, and go back to email notification settings screen
        await EmailNotificationSettingsScreen.toggleEmailThreadsOptionOn();
        await EmailNotificationSettingsScreen.back();
        await EmailNotificationSettingsScreen.open();
    });
});
