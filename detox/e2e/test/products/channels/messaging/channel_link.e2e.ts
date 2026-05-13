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
        await element(by.text(channelLink)).tap();
        await wait(timeouts.FOUR_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4877_2 - should be able to open joined channel by tapping on channel link from reply thread', async () => {
        // # Open a channel screen, post a channel link to target channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelLink = `${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name}`;
        await ChannelScreen.postMessage(channelLink);

        // # Wait for keyboard to dismiss and message to be visible
        await wait(timeouts.TWO_SEC);

        // # Open reply thread for the post containing the channel link
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openReplyThreadFor(post.id, channelLink);

        // # Tap on channel link from within the reply thread
        await element(by.text(channelLink)).atIndex(0).tap({x: 5, y: 10});
        await wait(timeouts.FOUR_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
