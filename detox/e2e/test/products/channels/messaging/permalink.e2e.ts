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
    PermalinkScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Permalink', () => {
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

    const expectPermalinkTargetMessage = async (teamName: any, permalinkTargetPost: any, permalinkTargetChannelDiplayName: string) => {
        // # Open a channel screen, post a permalink to target post, and tap on permalink
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const permalinkLabel = `permalink-${getRandomId()}`;
        const permalinkMessage = `[${permalinkLabel}](/${teamName}/pl/${permalinkTargetPost.id})`;
        await ChannelScreen.postMessage(permalinkMessage);
        await element(by.text(permalinkLabel)).tap({x: 5, y: 10});
        await wait(timeouts.ONE_SEC);

        // * Verify on permalink screen and target post is displayed
        await PermalinkScreen.toBeVisible();
        const {postListPostItem: permalinkPostListPostItem} = PermalinkScreen.getPostListPostItem(permalinkTargetPost.id, permalinkTargetPost.message);
        await expect(permalinkPostListPostItem).toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and target post is displayed
        await expect(ChannelScreen.headerTitle).toHaveText(permalinkTargetChannelDiplayName);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(permalinkTargetPost.id, permalinkTargetPost.message);
        await expect(channelPostListPostItem).toBeVisible();
    };

    it('MM-T4876_1 - should be able to jump to target public channel post by tapping on permalink with team name', async () => {
        // # Post a target message in a target public channel
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        await expectPermalinkTargetMessage(testTeam.name, permalinkTargetPost.post, targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4876_2 - should be able to jump to target public channel post by tapping on permalink with _redirect', async () => {
        // # Post a target message in a target public channel
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        await expectPermalinkTargetMessage('_redirect', permalinkTargetPost.post, targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4876_3 - should be able to jump to target DM post by tapping on permalink with team name', async () => {
        // # Post a target message in a target DM channel
        const {user: dmOtherUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'testchannel-1'});
        const {channel: targetChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmOtherUser.id]);
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        await expectPermalinkTargetMessage(testTeam.name, permalinkTargetPost.post, dmOtherUser.username);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4876_4 - should be able to jump to target DM post by tapping on permalink with _redirect', async () => {
        // # Post a target message in a target DM channel
        const {user: dmOtherUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'testchannel-1'});
        const {channel: targetChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmOtherUser.id]);
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        await expectPermalinkTargetMessage('_redirect', permalinkTargetPost.post, dmOtherUser.username);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
