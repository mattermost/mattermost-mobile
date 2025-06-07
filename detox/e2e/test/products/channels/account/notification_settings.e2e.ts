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
    AutoResponderNotificationSettingsScreen,
    EmailNotificationSettingsScreen,
    HomeScreen,
    LoginScreen,
    MentionNotificationSettingsScreen,
    NotificationSettingsScreen,
    PushNotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, and go to notification settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on notification settings screen
        await NotificationSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5101_1 - should match elements on notification settings screen', async () => {
        // * Verify basic elements on notification settings screen
        await expect(NotificationSettingsScreen.backButton).toBeVisible();
        await expect(NotificationSettingsScreen.mentionsOption).toBeVisible();
        await expect(NotificationSettingsScreen.pushNotificationsOption).toBeVisible();
        await expect(NotificationSettingsScreen.emailNotificationsOption).toBeVisible();
        await expect(NotificationSettingsScreen.automaticRepliesOption).toBeVisible();
    });

    it('MM-T5101_2 - should be able to go to mention notification settings screen', async () => {
        // # Tap on mention option
        await NotificationSettingsScreen.mentionsOption.tap();

        // * Verify on mention notification settings screen
        await MentionNotificationSettingsScreen.toBeVisible();

        // # Go back to notification settings screen
        await MentionNotificationSettingsScreen.back();
    });

    it('MM-T5101_3 - should be able to go to push notification settings screen', async () => {
        // # Tap on push notifications option
        await NotificationSettingsScreen.pushNotificationsOption.tap();

        // * Verify on push notification settings screen
        await PushNotificationSettingsScreen.toBeVisible();

        // # Go back to notification settings screen
        await PushNotificationSettingsScreen.back();
    });

    it('MM-T5101_4 - should be able to go to email notification settings screen', async () => {
        // # Tap on email notifications option
        await NotificationSettingsScreen.emailNotificationsOption.tap();

        // # Verify on email notification settings screen
        await EmailNotificationSettingsScreen.toBeVisible();

        // # Go back to notification settings screen
        await EmailNotificationSettingsScreen.back();
    });

    it('MM-T5101_5 - should be able to go to auto-responder notification settings screen', async () => {
        // # Tap on automatic replies option
        await NotificationSettingsScreen.automaticRepliesOption.tap();

        // # Verify on auto-responder notification settings screen
        await AutoResponderNotificationSettingsScreen.toBeVisible();

        // # Go back to notification settings screen
        await AutoResponderNotificationSettingsScreen.back();
    });
});
