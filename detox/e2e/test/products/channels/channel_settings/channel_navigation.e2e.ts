// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    FindChannelsScreen,
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const favoritesCategory = 'favorites';
    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let archiveChannel: any;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;
        testTeam = team;

        // Create a separate channel for archiving test
        const {channel: archiveCh} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: `archive-test-${getRandomId()}`,
            displayName: `Archive Test ${getRandomId()}`,
            type: 'O',
        });
        archiveChannel = archiveCh;

        await wait(timeouts.THREE_SEC);
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archiveChannel.id);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3189 - RN apps Display channel list', async () => {
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T3190 - RN apps Display Channel Info', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.toBeVisible();

        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3191 - RN apps Change channel', async () => {

        await FindChannelsScreen.open();
        await wait(timeouts.ONE_SEC);

        const searchTerm = testChannel.name.substring(0, 3);
        await FindChannelsScreen.searchInput.typeText(searchTerm);
        await wait(timeouts.TWO_SEC);

        await expect(FindChannelsScreen.getFilteredChannelItem(testChannel.name)).toBeVisible();
        await FindChannelsScreen.getFilteredChannelItem(testChannel.name).tap();
        await wait(timeouts.ONE_SEC);

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await ChannelScreen.back();
    });

    it('MM-T850 - RN apps Favorite a channel', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();
        await ChannelInfoScreen.favoriteAction.tap();

        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Verify channel is listed under favorites category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T3192 - RN apps Un-favorite a channel', async () => {
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        await ChannelInfoScreen.unfavoriteAction.tap();

        await wait(timeouts.THREE_SEC);
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T3197 - RN apps Archive public or private channel', async () => {
        // # Navigate to the archive channel
        await ChannelScreen.open(channelsCategory, archiveChannel.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Scroll to bottom to reveal archive option
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await wait(timeouts.ONE_SEC);

        // # Archive the channel
        await ChannelInfoScreen.archivePublicChannel({confirm: true});

        // * Verify channel info screen is closed
        await wait(timeouts.TWO_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).not.toBeVisible();

        // * Verify we're back at channel list
        await ChannelListScreen.toBeVisible();

        // * Verify archived channel is not visible in the list
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, archiveChannel.name)).not.toBeVisible();
    });
});
