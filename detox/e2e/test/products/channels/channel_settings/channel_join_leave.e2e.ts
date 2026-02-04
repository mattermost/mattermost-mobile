// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3200: RN apps Join existing channel
 * - MM-T3202: RN apps Leave public channel
 * - MM-T3207: RN apps Leave private channel
 * - MM-T3188: RN apps Search for public channel Cancel search join channel
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testChannel: any;
    let privateChannel: any;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;

        const {channel: privateChannelData} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', prefix: 'channel', teamId: team.id});
        privateChannel = privateChannelData;

        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privateChannel.id);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3200 - RN apps Join existing channel', async () => {

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);
        const joinMessage = `${testUser.username} joined the channel`;
        await waitFor(element(by.text(joinMessage).withAncestor(by.id('post_list')))).
            toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T3202 - RN apps Leave public channel', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await expect(ChannelInfoScreen.leaveChannelOption).toBeVisible();
        await ChannelInfoScreen.leaveChannelOption.tap();

        await wait(timeouts.ONE_SEC);
        const leaveAlertTitle = 'Leave channel';
        await expect(element(by.text(leaveAlertTitle))).toBeVisible();
        await expect(element(by.text(`Are you sure you want to leave the public channel ${testChannel.display_name}? You can always rejoin.`))).toBeVisible();

        await Alert.leaveButton.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T3207 - RN apps Leave private channel', async () => {

        await ChannelScreen.open(channelsCategory, privateChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.scrollView.scrollTo('bottom');

        await expect(ChannelInfoScreen.leaveChannelOption).toBeVisible();
        await ChannelInfoScreen.leaveChannelOption.tap();

        await wait(timeouts.ONE_SEC);
        await expect(element(by.text('Leave channel'))).toBeVisible();
        await expect(element(by.text(`Are you sure you want to leave the private channel ${privateChannel.display_name}? You cannot rejoin the channel unless you're invited again.`))).toBeVisible();
        await Alert.leaveButton.tap();

        await wait(timeouts.TWO_SEC);
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T3188 - RN apps Search for public channel Cancel search join channel', async () => {
        const channelName = testChannel.name;

        await BrowseChannelsScreen.open();

        const searchTerm = channelName.substring(0, 4);
        await BrowseChannelsScreen.searchInput.typeText(searchTerm);
        await wait(timeouts.TWO_SEC);

        await expect(BrowseChannelsScreen.getChannelItemDisplayName(testChannel.name)).toHaveText(testChannel.display_name);
        await BrowseChannelsScreen.getChannelItem(testChannel.name).multiTap(2);
        await wait(timeouts.ONE_SEC);

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await ChannelScreen.back();
    });
});
