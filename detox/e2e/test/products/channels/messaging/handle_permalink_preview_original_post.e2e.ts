// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
    PermalinkScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    getRandomId,
    timeouts,
    wait,
} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Permalink Preview', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let testOtherUser: any;

    const copyLinkFromPost = async (postId: string, message: string) => {
        await ChannelScreen.openPostOptionsFor(postId, message);
        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.FOUR_SEC);
        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();
    };

    const sendMessage = async (text: string) => {
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(text);
        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();
    };

    const expectPermalinkPreviewVisible = async (message: string, channelName: string) => {
        const container = element(by.id('permalink-preview-container'));

        // Use TEN_SEC: posting a permalink URL triggers a server fetch + re-render that
        // can exceed 4s on a loaded CI runner, causing intermittent timeouts.
        await waitFor(container).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
        await expect(element(by.text(`Originally posted in ~${channelName}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
    };

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
        if (!testOtherUser?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, testChannel.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T4877_7 - should handle permalink preview when original post is deleted', async () => {
        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);

        const targetMessage = `Message to be deleted ${getRandomId()}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(targetMessage);

        await wait(timeouts.TWO_SEC);
        const {post: targetPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.id, targetMessage);
        await expect(postListPostItem).toBeVisible();
        await wait(timeouts.ONE_SEC);
        await copyLinkFromPost(targetPost.id, targetMessage);

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.id}`;
        const messageWithPastedLink = `Check this post ${copiedPermalink}`;
        await sendMessage(messageWithPastedLink);
        await wait(timeouts.FOUR_SEC);

        await expectPermalinkPreviewVisible(targetMessage, testChannel.display_name);

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const {postListPostItem: postToDelete} = ChannelScreen.getPostListPostItem(targetPost.id, targetMessage);
        await postToDelete.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.deletePost({confirm: true});

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        await wait(timeouts.FOUR_SEC);

        await expect(element(by.text(targetMessage).withAncestor(by.id('permalink-preview-container')))).not.toBeVisible();
        await expect(element(by.id('permalink-preview-container'))).not.toBeVisible();

        await ChannelScreen.back();
    });
});
