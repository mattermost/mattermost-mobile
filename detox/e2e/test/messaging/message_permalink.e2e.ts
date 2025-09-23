// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
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

    it('MM-T4877_1 - should render permalink preview modal when posting a message with copied permalink', async () => {
        const targetMessage = `Target message ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: targetMessage,
            userId: testOtherUser.id,
        });

        await ChannelScreen.open(channelsCategory, testChannel.name);

        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.post.id, targetMessage);
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.post.id}`;
        const messageWithPastedLink = `Check this out ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();

        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await expect(element(by.text(targetMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
        await expect(element(by.text(`Originally posted in ~${testChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T4877_2 - should copy link and create permalink preview in different channel', async () => {
        const targetMessage = `Important announcement ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: targetMessage,
            userId: testOtherUser.id,
        });

        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);

        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.post.id, targetMessage);
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.post.id}`;
        const messageWithPastedLink = `Check this out from the other channel ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();

        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await expect(element(by.text(targetMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
        await expect(element(by.text(`Originally posted in ~${testChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T4877_3 - should navigate to original post when tapping on permalink preview', async () => {
        // Create both channels at the beginning
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, targetChannel.id);

        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);

        const targetMessage = `Original post ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: targetMessage,
            userId: testOtherUser.id,
        });

        await ChannelScreen.open(channelsCategory, targetChannel.name);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.post.id, targetMessage);
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.post.id}`;
        const messageWithPastedLink = `Check this out ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();

        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await expect(element(by.text(targetMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await expect(element(by.text(`Originally posted in ~${targetChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await permalinkPreview.tap();
        await wait(timeouts.ONE_SEC);

        await PermalinkScreen.toBeVisible();

        const {postListPostItem: permalinkPostItem} = PermalinkScreen.getPostListPostItem(targetPost.post.id, targetMessage);
        await expect(permalinkPostItem).toBeVisible();

        await PermalinkScreen.jumpToRecentMessages();

        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        await ChannelScreen.back();
    });

    it('MM-T4877_4 - should update permalink preview when original post is edited', async () => {
        // Create the other channel at the beginning
        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);

        const originalMessage = `Original message ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: originalMessage,
            userId: testOtherUser.id,
        });

        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.post.id, originalMessage);
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.post.id}`;
        const messageWithPastedLink = `Check this out ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();
        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.text(originalMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await expect(element(by.text(`Originally posted in ~${testChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const editedMessage = `Edited message ${getRandomId()}`;
        await Post.apiPatchPost(siteOneUrl, targetPost.post.id, JSON.stringify({message: editedMessage}));

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        await wait(timeouts.FOUR_SEC);

        await expect(element(by.text(editedMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
        await expect(element(by.text(originalMessage).withAncestor(by.id('permalink-preview-container')))).not.toBeVisible();
        await expect(element(by.text(`Originally posted in ~${testChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T4877_6 - should handle permalink preview with long message content', async () => {
        // Create the other channel at the beginning
        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, otherChannel.id);

        const longMessage = 'This is a very long message that should be truncated in the permalink preview when it exceeds the maximum character limit. The preview should show only a portion of this content and add ellipsis to indicate there is more content available. This message is intentionally longer than 150 characters to test the truncation functionality properly.';
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: longMessage,
            userId: testOtherUser.id,
        });

        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(targetPost.post.id, longMessage);
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.post.id}`;
        const messageWithPastedLink = `Long message link ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();

        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        const truncatedText = longMessage.substring(0, 150) + '...';
        await expect(element(by.text(truncatedText).withAncestor(by.id('permalink-preview-container')))).toBeVisible();
        await expect(element(by.text(longMessage).withAncestor(by.id('permalink-preview-container')))).not.toBeVisible();
        await expect(element(by.text(`Originally posted in ~${testChannel.display_name}`).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T4877_7 - should handle permalink preview when original post is deleted', async () => {
        // Create the other channel at the beginning
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
        await postListPostItem.longPress();

        await PostOptionsScreen.toBeVisible();
        await PostOptionsScreen.copyLinkOption.tap();
        await wait(timeouts.ONE_SEC);

        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, otherChannel.name);

        const copiedPermalink = `${serverOneUrl}/${testTeam.name}/pl/${targetPost.id}`;
        const messageWithPastedLink = `Check this post ${copiedPermalink}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(messageWithPastedLink);

        await waitFor(ChannelScreen.sendButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.sendButton.tap();
        await wait(timeouts.FOUR_SEC);

        const permalinkPreview = element(by.id('permalink-preview-container'));
        await waitFor(permalinkPreview).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(element(by.text(targetMessage).withAncestor(by.id('permalink-preview-container')))).toBeVisible();

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
        await expect(permalinkPreview).not.toBeVisible();

        await ChannelScreen.back();
    });
});
