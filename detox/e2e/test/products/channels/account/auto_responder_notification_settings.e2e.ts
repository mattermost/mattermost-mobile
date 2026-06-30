// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, System} from '@support/server_api';
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
import {getRandomId, isAndroid, isIos, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Account - Settings - Auto-Responder Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        // Fast-fail if server is unreachable — avoids a 240 s hook timeout
        await System.apiCheckSystemHealth(siteOneUrl);

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Enable ExperimentalEnableAutomaticReplies so the auto-responder option appears
        await System.apiUpdateConfig(siteOneUrl, {TeamSettings: {ExperimentalEnableAutomaticReplies: true}});

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
        // On Android edge-to-edge the navigation back button sits near the top of the
        // screen and can be partially covered by the status bar (<50% visible area).
        // Use toExist() on Android to confirm presence without the visibility threshold.
        if (isAndroid()) {
            await waitFor(AutoResponderNotificationSettingsScreen.backButton).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await expect(AutoResponderNotificationSettingsScreen.backButton).toBeVisible();
        }
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

        // Use waitFor instead of expect to tolerate Android UI update latency.
        // After navigating back, the automaticRepliesOptionInfo text may briefly
        // show a stale value on API 35 CI emulators before the DB write completes.
        await waitFor(NotificationSettingsScreen.automaticRepliesOptionInfo).toHaveText('Off').withTimeout(timeouts.TEN_SEC);

        // * Go back to auto-responder notification settings screen
        await AutoResponderNotificationSettingsScreen.open();

        // * Verify enable automatic replies option is toggled off and message input does not exist
        await expect(AutoResponderNotificationSettingsScreen.enableAutomaticRepliesOptionToggledOff).toBeVisible();
        await expect(AutoResponderNotificationSettingsScreen.messageInput).not.toExist();
    });
});
