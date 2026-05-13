// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {System} from '@support/server_api';
import {serverTwoUrl, siteTwoUrl} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {getAdminAccount, getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Unarchive Channel', () => {
    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {
        // # Enable archived channel viewing so the app stays on the archived
        // channel screen after archiving (membership preserved). Without this,
        // the server removes the user from the channel on archive, making it
        // impossible to open and unarchive via the mobile UI.
        await System.apiUpdateConfig(siteTwoUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        // # Ensure a clean app state regardless of what the previous suite left behind.
        // Disable Detox synchronization during app init: after newInstance the JS bridge
        // (mqt_js) is busy bootstrapping React Native, causing BridgeIdlingResource to
        // block indefinitely and LoginScreen.toBeVisible() to time out on Android CI.
        await device.launchApp({newInstance: true, launchArgs: {detoxDisableSynchronization: 'YES'}});

        // # Log in to server as admin
        await ServerScreen.connectToServer(serverTwoUrl, serverOneDisplayName);
        await LoginScreen.loginAsAdmin(getAdminAccount());

        // Re-enable synchronization now that the app has settled past the init bridge burst.
        await device.enableSynchronization();

        // Wait for config to sync after login. The app fetches config on login, but
        // on CI the network request can take longer. Without this wait, the first
        // channel operation may see stale config (ExperimentalViewArchivedChannels=false).
        await wait(timeouts.TWO_SEC);

        // Wait for the channel list header plus button to be fully visible and hittable
        // before any test attempts to tap it. A fixed TWO_SEC sleep was insufficient on
        // iOS/Android CI where the navigation animation can take longer after relaunch.
        await waitFor(ChannelListScreen.headerPlusButton).toBeVisible().withTimeout(timeouts.HALF_MIN);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4944_1 - should be able to unarchive a public channel and confirm', async () => {
        // # Create a public channel
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);

        // # Dismiss scheduled post tooltip if it appears (admin-only tooltip, may
        // not appear on all server configurations or after first dismissal)
        await ChannelScreen.dismissScheduledPostTooltip();

        // # Archive the channel via channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // * Verify channel is in archived (read-only) state — with ExperimentalViewArchivedChannels
        // enabled the app stays on the channel screen after archiving
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraftArchived).toBeVisible();

        // # Unarchive the channel from channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePublicChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // * Verify channel is now active — post draft (not archived view) is visible
        await expect(ChannelScreen.postDraft).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4944_2 - should be able to unarchive a private channel and confirm', async () => {
        // # Create a private channel
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);

        // # Archive the channel via channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePrivateChannel({confirm: true});

        // * Verify channel is in archived (read-only) state
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraftArchived).toBeVisible();

        // # Unarchive the channel from channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePrivateChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // * Verify channel is now active — post draft is visible
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraft).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
