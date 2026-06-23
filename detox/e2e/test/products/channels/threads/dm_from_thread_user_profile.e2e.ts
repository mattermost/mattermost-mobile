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
    Team,
    User,
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
    ThreadScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Threads - DM From Reply Author Profile', () => {
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

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3211_1 - should open DM from user profile accessed in reply thread', async () => {
        // # Create a second user and add to team/channel
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, otherUser.id, testChannel.id);

        // # Create a root post and a reply from the other user
        const rootMessage = `Thread root ${getRandomId()}`;
        const {post: rootPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: rootMessage,
        });
        const replyMessage = `Reply from other ${getRandomId()}`;
        const {post: replyPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: replyMessage,
            rootId: rootPost.id,
        });

        // # Open the channel and navigate to the reply thread
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify root post is visible before attempting long-press
        const {postListPostItem: rootPostItem} = ChannelScreen.getPostListPostItem(rootPost.id, rootMessage);
        await waitFor(rootPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.openReplyThreadFor(rootPost.id, rootMessage);
        await ThreadScreen.toBeVisible();
        await wait(timeouts.ONE_SEC);

        // # Tap the reply author's display name to open their profile
        const {postListPostItemHeaderDisplayName: replyPostHeader} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await replyPostHeader.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify user profile screen is visible with send message option
        await UserProfileScreen.toBeVisible();
        await expect(UserProfileScreen.sendMessageProfileOption).toBeVisible();

        // # Tap send message to open a DM
        await UserProfileScreen.sendMessageProfileOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the DM channel screen is visible
        await ChannelScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
