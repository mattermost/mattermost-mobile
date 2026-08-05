// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Post, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelDropdownMenuScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    closeArchivedChannel,
    openArchivedChannel,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

// beforeAll: 4 channels + login under CI load — 6min hook timeout.
jest.setTimeout(360000);

// beforeAll: 4 channels + login under CI load — 6min hook timeout.
jest.setTimeout(360000);

describe('Channels - Archive Channel from Settings', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    // Pre-create channels before login — sidebar sync via HTTP, not delayed WS on Android API 35.
    let channelForT1703: any;

    beforeAll(async () => {
        // # Ensure archived channels are visible in browse channels
        // Set config BEFORE login so the config is fetched during connection
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // Create channels and add testUser BEFORE login. The initial HTTP channel
        // sync on login fetches all member channels, so these appear in the sidebar
        // without depending on a WebSocket user_added event.
        const makeChannel = async (type: 'O' | 'P', prefix: string) => {
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {type, teamId: testTeam.id, prefix});
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            return channel;
        };
        channelForT1703 = await makeChannel('O', 'arc-t1703');

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may have appeared asynchronously via WebSocket events
        // from the previous test's channel archival. These native Alert dialogs
        // block all Detox interactions until dismissed.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // Close Browse Channels if a prior test timed out mid-navigation — an open
        // modal blocks ChannelListScreen.toBeVisible() and causes 300s hook timeouts.
        try {
            await waitFor(BrowseChannelsScreen.browseChannelsScreen).toExist().withTimeout(timeouts.TWO_SEC);
            await BrowseChannelsScreen.close();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Browse Channels is not open
        }

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T1703_1 - should be able to open archived channels and verify read-only state', async () => {
        // # Use pre-created channel (created before login to avoid WebSocket delay on Android)
        const archivedChannel = channelForT1703;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(archivedChannel.name, timeouts.ONE_MIN);

        // # Post a sentinel message via API for the search/permalink fallback in openArchivedChannel.
        // Must run before archival — the server rejects posts to archived channels.
        const sentinel = `archived-from-settings-${Date.now()}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message: sentinel,
        });

        // # Navigate to the channel and archive it via UI
        await ChannelScreen.open(channelsCategory, archivedChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Dismiss channel info so the archived post draft is reachable (same as MM-T4932_*).
        await ChannelInfoScreen.close();

        // * Verify the archived post draft view is shown (channel is read-only). Android
        // edge-to-edge can render it below 50% visibility, so toExist() is the reliable check.
        if (isAndroid()) {
            await waitFor(ChannelScreen.postDraftArchivedCloseChannelButton).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(ChannelScreen.postDraftArchivedCloseChannelButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }

        // # Navigate back to channel list via back button
        await ChannelScreen.back();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Verify the archived filter works from Browse Channels on iOS only.
        // Android: archived-filter tap crashes during bottom-sheet dismiss (RN Fabric).
        if (!isAndroid()) {
            await BrowseChannelsScreen.open();
            await ChannelDropdownMenuScreen.open();
            await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
            await wait(timeouts.ONE_SEC);
            await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);

            // * Verify archived channel appears in the list
            await wait(timeouts.ONE_SEC);
            await expect(
                BrowseChannelsScreen.getChannelItemDisplayName(archivedChannel.name),
            ).toHaveText(archivedChannel.display_name);

            await BrowseChannelsScreen.close();
        }

        // # Open the archived channel and verify read-only state.
        await openArchivedChannel(archivedChannel.name, sentinel, post.id);

        // * Verify the close channel button is visible at the bottom
        if (isAndroid()) {
            await waitFor(ChannelScreen.postDraftArchivedCloseChannelButton).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitForElementToBeVisible(
                ChannelScreen.postDraftArchivedCloseChannelButton,
                timeouts.TEN_SEC,
            );
        }

        // # Navigate back to channel list
        await closeArchivedChannel();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();
    });
});
