// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

describe('Channels - Archive Channel from Settings', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    // Pre-created channels for tests that need to navigate to a live channel
    // via the sidebar before archiving. Created BEFORE login so they appear via
    // the initial HTTP channel sync instead of a WebSocket event — on Android
    // API 35 emulators, WS delivery can be delayed by several minutes after login.
    let channelForT4932_1: any;
    let channelForT4932_2: any;
    let channelForT4932_3: any;
    let channelForT3208: any;

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

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4932_1 - should be able to archive a public channel and confirm', async () => {
        // # Open a public channel screen, open channel info screen, go to channel settings, and tap on archive channel option and confirm
        const publicChannel = channelForT4932_1;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state).
        // The archive WS event must propagate through the DB observable to the post draft
        // component before the archived close-channel button mounts. Poll because a
        // one-shot expect().toBeVisible() can race the observable update on slower devices.
        await waitFor(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list via back button
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(publicChannel.name);

        // * Verify search returns no results in the default public channels view
        await waitFor(element(by.text(`No matches found for “${publicChannel.name}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4932_2 - should be able to archive a public channel and cancel', async () => {
        // # Open a public channel screen, open channel info screen, go to channel settings, and tap on archive channel option and cancel
        const publicChannel = channelForT4932_2;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(publicChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: false});

        // * Verify still on channel settings screen
        await ChannelSettingsScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4932_3 - should be able to archive a private channel and confirm', async () => {
        // # Open a private channel screen, open channel info screen, go to channel settings, and tap on archive channel option and confirm
        const privateChannel = channelForT4932_3;
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(privateChannel.name, timeouts.ONE_MIN);
        await ChannelScreen.open(channelsCategory, privateChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePrivateChannel({confirm: true});

        // # Channel settings closes but channel info modal remains; dismiss it to reach channel screen
        await ChannelInfoScreen.close();

        // * Verify the close channel button is visible (confirms archived state).
        // Poll the assertion — see MM-T4932_1 above for the same DB-observable race.
        await waitFor(
            ChannelScreen.postDraftArchivedCloseChannelButton,
        ).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list via back button
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(privateChannel.name);

        // * Verify search returns no results in the default public channels view
        await waitFor(element(by.text(`No matches found for “${privateChannel.name}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
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
