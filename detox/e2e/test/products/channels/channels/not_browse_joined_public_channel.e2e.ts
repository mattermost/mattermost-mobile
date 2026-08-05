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
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
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

    it('MM-T4729_6 - should not be able to browse a joined public channel', async () => {
        // # Open browse channels screen and search for a joined public channel
        const {channel: joinedPublicChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'O', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, joinedPublicChannel.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(joinedPublicChannel.name);

        // * Verify empty search state for browse channels
        await waitFor(element(by.text(`No matches found for \u201C${joinedPublicChannel.name}\u201D`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });
});
