// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T850: RN apps Favorite a channel
 * - MM-T3192: RN apps Un-favorite a channel
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T850 - RN apps Favorite a channel', async () => {
        // # Setup: Create a test channel
        const channelName = `fav-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: Tap on the button to the right on "Favorite"
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();
        await ChannelInfoScreen.favoriteAction.tap();

        // * Button should show green (selected)
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        // Close channel info
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Be displayed in 'FAVORITES' list of channels
        await expect(ChannelListScreen.getCategoryExpanded('favorites')).toBeVisible();
        await expect(ChannelListScreen.getChannelItem('favorites', channel.display_name)).toBeVisible();
    });

    it('MM-T3192 - RN apps Un-favorite a channel', async () => {
        // # Setup: Create a test channel and favorite it
        const channelName = `unfav-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Navigate to the channel and favorite it
        await ChannelScreen.open('public', channel.display_name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.favoriteAction.tap();
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        // # Step 1: Tap on the button to the right of "Favorite" in channel info
        await ChannelInfoScreen.unfavoriteAction.tap();

        // * Button should show grey (off)
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();

        // Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Channel should be removed from "FAVORITES" list of channels
        // The channel should now be in public channels, not favorites
        await expect(ChannelListScreen.getChannelItem('public', channel.display_name)).toBeVisible();
    });
});
