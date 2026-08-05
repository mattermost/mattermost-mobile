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

    it('MM-T3208 - should show confirmation dialog when archiving a channel and archive on confirm', async () => {
        // # Navigate to a pre-created public channel
        const publicChannel = channelForT3208;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);

        // # Open channel info, go to channel settings
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();

        // # Tap archive and cancel — verify still on channel settings screen
        await ChannelSettingsScreen.archivePublicChannel({confirm: false});
        await ChannelSettingsScreen.toBeVisible();

        // # Tap archive and confirm
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state).
        // Poll the assertion — see MM-T4932_1 above for the same DB-observable race.
        await waitFor(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list via back button
        await ChannelScreen.back();

        // * Verify channel list is shown (channel was archived successfully)
        await ChannelListScreen.toBeVisible();
    });
});
