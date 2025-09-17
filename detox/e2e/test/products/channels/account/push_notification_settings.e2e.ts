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
    HomeScreen,
    LoginScreen,
    NotificationSettingsScreen,
    PushNotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Push Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open notification settings screen, and go to push notification settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
        await PushNotificationSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on push notification settings screen
        await PushNotificationSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await PushNotificationSettingsScreen.back();
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5108_1 - should match elements on push notification settings screen', async () => {
        // * Verify basic elements on push notification settings screen
        await expect(PushNotificationSettingsScreen.backButton).toBeVisible();
        await expect(PushNotificationSettingsScreen.allNewMessagesOption).toBeVisible();
        await expect(PushNotificationSettingsScreen.mentionsOnlyOption).toBeVisible();
        await expect(PushNotificationSettingsScreen.nothingOption).toBeVisible();
        await expect(PushNotificationSettingsScreen.pushThreadsFollowingOptionToggledOn).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileOnlineOption).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileAwayOption).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileOfflineOption).toBeVisible();
    });

    it('MM-T5108_2 - should be able to change push notification settings and save by tapping navigation back button', async () => {
        // # Tap on all new messages option, tap on mobile online option, tap on back button, and go back to push notification settings screen
        await PushNotificationSettingsScreen.allNewMessagesOption.tap();
        await PushNotificationSettingsScreen.mobileOnlineOption.tap();
        await PushNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();

        // * Verify all new messages option and mobile online option are selected and push threads following option does not exist
        await expect(PushNotificationSettingsScreen.allNewMessagesOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileOnlineOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.pushThreadsFollowingOptionToggledOn).not.toExist();

        // # Tap on nothing option, tap on back button, and go back to push notification settings screen
        await PushNotificationSettingsScreen.nothingOption.tap();
        await PushNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();

        // * Verify nothing option is selected and mobile options do no exist
        await expect(PushNotificationSettingsScreen.nothingOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileOnlineOption).not.toExist();
        await expect(PushNotificationSettingsScreen.mobileAwayOption).not.toExist();
        await expect(PushNotificationSettingsScreen.mobileOfflineOption).not.toExist();

        // # Tap on mentions only option, tap on mobile away option, toggle push threads following option off, tap on back button, and go back to push notification settings screen
        await PushNotificationSettingsScreen.mentionsOnlyOption.tap();
        await PushNotificationSettingsScreen.mobileAwayOption.tap();
        await PushNotificationSettingsScreen.togglePushThreadsFollowingOptionOff();
        await PushNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();

        // * Verify mentions only option and mobile away option are selected and push threads following option is toggled off
        await expect(PushNotificationSettingsScreen.mentionsOnlyOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileAwayOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.pushThreadsFollowingOptionToggledOff).toBeVisible();

        // # Toggle push threads following option on, tap on back button, and go back to push notification settings screen
        await PushNotificationSettingsScreen.togglePushThreadsFollowingOptionOn();
        await PushNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();

        // * Verify push threads following option is toggled on
        await expect(PushNotificationSettingsScreen.pushThreadsFollowingOptionToggledOn).toBeVisible();
    });
});
