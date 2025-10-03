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
    HomeScreen,
    LoginScreen,
    NotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {getRandomId, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Account - Settings - Auto-Responder Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open notification settings screen, and go to auto-responder notification settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
        await AutoResponderNotificationSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on auto-responder notification settings screen
        await AutoResponderNotificationSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await AutoResponderNotificationSettingsScreen.back();
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5110_1 - should match elements on auto-responder notification settings screen', async () => {
        // * Verify basic elements on auto-responder notification settings screen
        await expect(AutoResponderNotificationSettingsScreen.backButton).toBeVisible();
        await expect(AutoResponderNotificationSettingsScreen.enableAutomaticRepliesOptionToggledOff).toBeVisible();
        await expect(AutoResponderNotificationSettingsScreen.messageInputDescription).toHaveText('Set a custom message that is automatically sent in response to direct messages, such as an out of office or vacation reply. Enabling this setting changes your status to Out of Office and disables notifications.');
    });

    it('MM-T5110_2 - should be able to change auto-responder notification settings and save by tapping navigation back button', async () => {
        // # Toggle enable automatic replies option on, type in message, and tap on back button
        const message = `Message ${getRandomId()}`;
        await AutoResponderNotificationSettingsScreen.toggleEnableAutomaticRepliesOptionOn();
        await AutoResponderNotificationSettingsScreen.messageInput.replaceText(message);
        await AutoResponderNotificationSettingsScreen.back();

        // * Verify on notification settings screen and automatic replies is enabled
        await NotificationSettingsScreen.toBeVisible();
        await expect(NotificationSettingsScreen.automaticRepliesOptionInfo).toHaveText('On');

        // * Go back to auto-responder notification settings screen
        await AutoResponderNotificationSettingsScreen.open();

        // * Verify enable automatic replies option is toggled on and message is saved
        await expect(AutoResponderNotificationSettingsScreen.enableAutomaticRepliesOptionToggledOn).toBeVisible();
        if (isIos()) {
            await expect(AutoResponderNotificationSettingsScreen.messageInput).toHaveValue(message);
        } else {
            await expect(AutoResponderNotificationSettingsScreen.messageInput).toHaveText(message);
        }

        // # Toggle enable automatic replies option off and tap on back button
        await AutoResponderNotificationSettingsScreen.toggleEnableAutomaticRepliesOptionOff();
        await AutoResponderNotificationSettingsScreen.back();

        // * Verify on notification settings screen and automatic replies is disabled
        await NotificationSettingsScreen.toBeVisible();
        await expect(NotificationSettingsScreen.automaticRepliesOptionInfo).toHaveText('Off');

        // * Go back to auto-responder notification settings screen
        await AutoResponderNotificationSettingsScreen.open();

        // * Verify enable automatic replies option is toggled off and message input does not exist
        await expect(AutoResponderNotificationSettingsScreen.enableAutomaticRepliesOptionToggledOff).toBeVisible();
        await expect(AutoResponderNotificationSettingsScreen.messageInput).not.toExist();
    });
});
