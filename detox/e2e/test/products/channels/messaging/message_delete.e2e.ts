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
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Delete', () => {
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

    it('MM-T4784_1 - should be able to delete a post message and confirm', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);

        // # Open post options for the message that was just posted, tap delete option and confirm
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify post message is deleted
        await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4784_2 - should be able to delete a post message and cancel', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);

        // # Open post options for the message that was just posted, tap delete option and cancel
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.deletePost({confirm: false});

        // * Verify post message is not deleted
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4784_3 - should be able to delete a post message from reply thread', async () => {
        // # Open a channel screen, post a message, and tap on the post to open reply thread
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, message);
        await waitFor(parentPostListPostItem).toExist().withTimeout(timeouts.FOUR_SEC);

        await parentPostListPostItem.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply, open post options for the reply message, tap delete option and confirm
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await waitFor(replyPostListPostItem).toExist().withTimeout(timeouts.FOUR_SEC);

        await ThreadScreen.openPostOptionsFor(replyPost.id, replyMessage);
        await PostOptionsScreen.deletePost({confirm: true});
        await wait(timeouts.TWO_SEC);

        // * Verify reply message is deleted
        await waitFor(replyPostListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
