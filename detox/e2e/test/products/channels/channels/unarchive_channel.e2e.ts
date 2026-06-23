// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {System} from '@support/server_api';
import {serverTwoUrl, siteTwoUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
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
import {getAdminAccount, getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';

// NOTE (stale skip rationale kept for history — suite is currently ENABLED and
// beforeAll passes on CI; failures in run 27302480506 were in the test bodies):
// Previously skipped — beforeAll hung deterministically (2/2 runs, 4-min JS-thread
// busy-loop on `LooperIdlingResource-mqt_v_js`, then 240s jest timeout).
// Root cause: this spec logs in as ADMIN (required to set
// `ExperimentalViewArchivedChannels`), and the admin session triggers a
// heavy server-state sync that keeps the JS thread busy past Detox's
// idling-resource timeout. Even with `detoxDisableSynchronization: 'YES'`
// during launch and a manual re-enable later, the subsequent
// `waitForElementToBeVisible` hangs.
//
// Fixing this requires either:
//   1. Moving the `ExperimentalViewArchivedChannels=true` config to the
//      provisioner (one-time setup, no admin login at test runtime), OR
//   2. Splitting setup into smaller chunks with explicit waits between
//      admin-only API calls and UI interactions.
// Track separately.
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

        // # Log in to server as admin.
        await ServerScreen.connectToServer(serverTwoUrl, serverOneDisplayName);
        await LoginScreen.loginAsAdmin(getAdminAccount());

        // Re-enable synchronization now that the app has settled past the init bridge burst.
        await device.enableSynchronization();

        // Wait for config to sync after login. The app fetches config on login, but
        // on CI the network request can take longer. Without this wait, the first
        // channel operation may see stale config (ExperimentalViewArchivedChannels=false).
        await wait(timeouts.TWO_SEC);

        // Wait for the channel list header plus button to be fully visible and hittable.
        // Use polling helper to avoid the bridge-idle block on Android API 35.
        await waitForElementToBeVisible(ChannelListScreen.headerPlusButton, timeouts.HALF_MIN);
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may have appeared asynchronously via WebSocket events
        // from the previous test's channel archival. These native Alert dialogs
        // block all Detox interactions until dismissed.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await System.apiUpdateConfig(siteTwoUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: false},
        });

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

        // # After archiving from channel settings, channel settings closes but the
        // channel info modal is still showing. Close it to reach the channel screen.
        await ChannelInfoScreen.close();

        // * Verify channel is in archived (read-only) state — with ExperimentalViewArchivedChannels
        // enabled the app stays on the channel screen after archiving.
        // Use polling (waitForElementToBeVisible) to survive the UITransitionView overlay
        // from the modal dismiss animation, which temporarily obscures the bottom of the screen.
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.TEN_SEC);

        // # Unarchive the channel from channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePublicChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // # As with archiving, channel settings closes after unarchiving but the
        // channel info modal remains on top of the channel screen (CI run
        // 27302480506: failure screenshot shows Channel Info still open while the
        // test asserts postDraft). Close it to reach the channel screen.
        await ChannelInfoScreen.close();

        // * Verify channel is now active — post draft (not archived view) is visible
        await waitForElementToBeVisible(ChannelScreen.postDraft, timeouts.TEN_SEC);

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

        // # Close channel info modal that remains after archiving, then poll for
        // postDraftArchived to survive the UITransitionView dismiss animation.
        await ChannelInfoScreen.close();
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.TEN_SEC);

        // # Unarchive the channel from channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePrivateChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // # Channel info modal remains after unarchiving (same as MM-T4944_1);
        // close it to reach the channel screen.
        await ChannelInfoScreen.close();

        // * Verify channel is now active — post draft is visible
        await ChannelScreen.toBeVisible();
        await waitForElementToBeVisible(ChannelScreen.postDraft, timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
