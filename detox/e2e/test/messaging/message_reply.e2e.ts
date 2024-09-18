// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Reply', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4785_1 - should be able to reply to a post via post options reply option', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for the message that was just posted, tap reply option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on reply thread screen and parent post is shown
        await ThreadScreen.toBeVisible();
        const {postListPostItem: threadParentPostListPostItem} = ThreadScreen.getPostListPostItem(post.id, message);
        await expect(threadParentPostListPostItem).toBeVisible();

        // # Reply to parent post
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply message is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4785_2 - should be able to open reply thread by tapping on the post', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Tap on post to open thread
        await postListPostItem.tap();

        // * Verify on reply thread screen
        await ThreadScreen.toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4785_3 - should not have reply option available on reply thread post options', async () => {
        // # Open a channel screen, post a message, and tap on the post
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await postListPostItem.tap();

        // * Verify on reply thread screen
        await ThreadScreen.toBeVisible();

        // # Open post options for the parent message
        await ThreadScreen.openPostOptionsFor(post.id, message);

        // * Verify reply option is not available
        await expect(PostOptionsScreen.replyPostOption).not.toExist();

        // # Go back to channel list screen
        await PostOptionsScreen.close();
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
