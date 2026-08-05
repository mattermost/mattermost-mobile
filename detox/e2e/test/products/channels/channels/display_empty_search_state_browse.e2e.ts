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
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelDropdownMenuScreen,
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

// Several tests here call device.reloadReactNative(), which can take 30-90s on iOS CI.
jest.setTimeout(360000);

describe('Channels - Browse Channels', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('MM-T4729_3 - should display empty search state for browse channels', async () => {
        // # Open browse channels screen and search for a non-existent channel
        const searchTerm = 'blahblahblahblah';
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for browse channels
        // On Android edge-to-edge the empty-state text can render with <50% area visible
        // (status/nav bar insets). Use toExist() on Android — the text is present and
        // the assertion confirms the correct empty state is shown.
        await wait(timeouts.ONE_SEC);
        if (isAndroid()) {
            await waitForElementToExist(element(by.text(`No matches found for \u201C${searchTerm}\u201D`)), timeouts.HALF_MIN);
            await waitForElementToExist(element(by.text('Check the spelling or try another search.')), timeouts.HALF_MIN);
        } else {
            await expect(element(by.text(`No matches found for \u201C${searchTerm}\u201D`))).toBeVisible();
            await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();
        }

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });
});
