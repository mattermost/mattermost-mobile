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
    let channelForT4932_1: any;
    let channelForT4932_2: any;
    let channelForT4932_3: any;
    let channelForT3208: any;
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
        channelForT4932_1 = await makeChannel('O', 'arc-pub-1');
        channelForT4932_2 = await makeChannel('O', 'arc-pub-2');
        channelForT4932_3 = await makeChannel('P', 'arc-prv-1');
        channelForT3208 = await makeChannel('O', 'arc-pub-3');
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

    it('MM-T1697_1 - should show archived channels option in browse public channels dropdown', async () => {
        // # Open browse channels screen
        await BrowseChannelsScreen.open();

        // * Verify the channel dropdown is visible
        await waitForElementToBeVisible(BrowseChannelsScreen.channelDropdown, timeouts.TEN_SEC);

        // # Tap on the channel dropdown to open it
        await ChannelDropdownMenuScreen.open();

        // * Verify the archived channels option is present in the dropdown
        await expect(ChannelDropdownMenuScreen.archivedChannelsItem).toBeVisible();

        // * Verify the public channels option is also present
        await expect(ChannelDropdownMenuScreen.publicChannelsItem).toBeVisible();

        // # Select archived channels to verify it can be selected
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();

        // * Verify dropdown is dismissed and the archived channels filter is applied
        await BrowseChannelsScreen.toBeVisible();
        await expect(
            BrowseChannelsScreen.channelDropdownTextArchived,
        ).toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });
});
