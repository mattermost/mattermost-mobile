// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Preference,
    Setup,
    System,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ReportProblemScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Account - Attach App Logs', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        // # Ensure AllowDownloadLogs is enabled on the server before login so the
        //   client fetches the expected config on startup
        await System.apiUpdateConfig(siteOneUrl, {
            SupportSettings: {
                AllowDownloadLogs: true,
            },
        });

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Ensure preference is reset
        await Preference.apiSaveUserPreferences(siteOneUrl, testUser.id, [{
            user_id: testUser.id,
            category: 'advanced_settings',
            name: 'attach_app_logs',
            value: 'false',
        }]);

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T67856_1 - should show attach logs toggle on Report a Problem screen', async () => {
        // # Navigate to Report a Problem screen
        await AccountScreen.open();
        await SettingsScreen.open();
        await ReportProblemScreen.open();

        // * Verify the attach logs toggle is visible and off by default
        await expect(ReportProblemScreen.enableLogAttachmentsToggleOff).toExist();

        // # Close Report a Problem and Settings screens
        await ReportProblemScreen.back();
        await SettingsScreen.close();
    });

    it('MM-T67856_2 - should show Attach app logs option in attachment menu after enabling toggle', async () => {
        // # Navigate to Report a Problem screen and enable the toggle
        await AccountScreen.open();
        await SettingsScreen.open();
        await ReportProblemScreen.open();
        await ReportProblemScreen.enableAttachLogs();

        // # Close Report a Problem and Settings screens
        await ReportProblemScreen.back();
        await SettingsScreen.close();

        // # Open a channel
        await ChannelListScreen.open();
        await ChannelScreen.open('channels', testChannel.name);

        // # Tap the attachment action button to open attachment options
        const attachmentAction = element(by.id('channel.post_draft.quick_actions.attachment_action'));
        await attachmentAction.tap();

        // * Wait for the attachment options bottom sheet to appear
        const attachmentScreen = element(by.id('channel.post_draft.quick_actions.attachment_action.screen'));
        await waitFor(attachmentScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify "Attach app logs" option is visible in the bottom sheet
        await expect(element(by.id('file_attachment.attach_logs'))).toExist();

        // # Close the attachment options bottom sheet
        await attachmentScreen.swipe('down', 'fast', 0.5);

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T67856_3 - should not show Attach app logs option when toggle is off', async () => {
        // # Navigate to Report a Problem screen and disable the toggle
        await AccountScreen.open();
        await SettingsScreen.open();
        await ReportProblemScreen.open();
        await ReportProblemScreen.disableAttachLogs();

        // # Close Report a Problem and Settings screens
        await ReportProblemScreen.back();
        await SettingsScreen.close();

        // # Open the channel
        await ChannelListScreen.open();
        await ChannelScreen.open('channels', testChannel.name);

        // # Tap the attachment action button to open attachment options
        const attachmentAction = element(by.id('channel.post_draft.quick_actions.attachment_action'));
        await attachmentAction.tap();

        // * Wait for the attachment options bottom sheet to appear
        const attachmentScreen = element(by.id('channel.post_draft.quick_actions.attachment_action.screen'));
        await waitFor(attachmentScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify "Attach app logs" option is NOT visible
        await expect(element(by.id('file_attachment.attach_logs'))).not.toExist();

        // * Verify other attachment options are still present
        await expect(element(by.id('file_attachment.photo_library'))).toExist();
        await expect(element(by.id('file_attachment.attach_file'))).toExist();

        // # Close the attachment options bottom sheet
        await attachmentScreen.swipe('down', 'fast', 0.5);

        // # Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T67856_4 - should not show attach logs toggle when AllowDownloadLogs is disabled', async () => {
        // # Disable AllowDownloadLogs and reload so the client re-fetches the
        //   updated config on startup
        await System.apiUpdateConfig(siteOneUrl, {
            SupportSettings: {
                AllowDownloadLogs: false,
            },
        });
        await device.reloadReactNative();

        try {
            // # Navigate to Report a Problem screen
            await AccountScreen.open();
            await SettingsScreen.open();
            await ReportProblemScreen.open();

            // * Verify the attach logs toggle is NOT visible in either state
            await expect(ReportProblemScreen.enableLogAttachmentsToggleOff).not.toExist();
            await expect(ReportProblemScreen.enableLogAttachmentsToggleOn).not.toExist();

            // # Close Report a Problem and Settings screens
            await ReportProblemScreen.back();
            await SettingsScreen.close();
        } finally {
            // # Restore AllowDownloadLogs for subsequent test suites even if
            //   an assertion or interaction above fails
            await System.apiUpdateConfig(siteOneUrl, {
                SupportSettings: {
                    AllowDownloadLogs: true,
                },
            });
        }
    });
});
