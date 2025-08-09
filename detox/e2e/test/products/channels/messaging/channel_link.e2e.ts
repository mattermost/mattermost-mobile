// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Channel Link', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4877_1 - should be able to open joined channel by tapping on channel link from main channel', async () => {
        // # Open a channel screen and post a channel link to target channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelLink = `${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name}`;
        await ChannelScreen.postMessage(channelLink);

        // # Tap on channel link
        await element(by.text(channelLink)).tap({x: 5, y: 10});
        await wait(timeouts.ONE_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4877_2 - should be able to open joined channel by tapping on channel link from reply thread', async () => {
        // # Open a channel screen, post a channel link to target channel, tap on post to open reply thread, and tap on channel link
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelLink = `${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name}`;
        await ChannelScreen.postMessage(channelLink);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id);
        await postListPostItem.tap({x: 1, y: 1});
        await element(by.text(channelLink)).tap({x: 5, y: 10});
        await wait(timeouts.ONE_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
