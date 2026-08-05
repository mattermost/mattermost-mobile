// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
    System,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelDropdownMenuScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

// Several tests here call device.reloadReactNative(), which can take 30-90s on iOS CI.
jest.setTimeout(360000);

describe('Channels - Browse Channels', () => {

    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        await System.apiCheckSystemHealth(siteOneUrl);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may appear asynchronously via WebSocket events from
        // the previous test's channel archival (e.g. MM-T4729_5).
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip Android: R1 product — join target channel name not found in browse list

    // Skip both: android flake (CI 29954156963) plus iOS CI 30437339535, where
    // ExperimentalViewArchivedChannels never propagated to the client config.

    it.skip('MM-T4729_5 - should be able to browse an archived channel', async () => {
        // # Enable archived channel visibility on the server, then reload so the app
        // picks up the new config (the ChannelDropdown only renders when this is true)
        await System.apiUpdateConfig(siteOneUrl, {ServiceSettings: {ExperimentalViewArchivedChannels: true}});

        // Poll the client config the app reads instead of reloading React Native, which took
        // 30-90s on iOS CI and pushed MM-T4729_5 past the global test timeout.
        const archivedChannelsConfigReady = await System.waitForClientConfigFlag(siteOneUrl, 'ExperimentalViewArchivedChannels', 'true', {maxAttempts: 10});
        if (!archivedChannelsConfigReady) {
            throw new Error('ExperimentalViewArchivedChannels did not propagate to the client config');
        }

        // # Create a channel, add the test user, then archive it
        const {channel: archivedChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archivedChannel.id);
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);

        // # Open browse channels screen and switch to archived channels view
        await BrowseChannelsScreen.open();

        await waitFor(BrowseChannelsScreen.channelDropdownTextPublic).toExist().withTimeout(timeouts.TEN_SEC);

        // Keep Detox sync enabled for archived filter tap — disableSynchronization
        // amplifies Fabric addViewAt races when the slide-up unmounts (CI 29362218938).
        await BrowseChannelsScreen.channelDropdownTextPublic.tap();
        await waitFor(ChannelDropdownMenuScreen.archivedChannelsItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
        await wait(timeouts.TWO_SEC);

        // Filter by name so the row does not depend on where it lands in the archived list.
        await BrowseChannelsScreen.searchInput.replaceText(archivedChannel.name);
        await waitFor(BrowseChannelsScreen.getChannelItem(archivedChannel.name)).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen and restore server config
        await BrowseChannelsScreen.close();
        await System.apiUpdateConfig(siteOneUrl, {ServiceSettings: {ExperimentalViewArchivedChannels: false}});
    });
});
