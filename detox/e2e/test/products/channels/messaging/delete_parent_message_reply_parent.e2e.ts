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
import {waitFor} from 'detox';

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

    // Skip: failed CI run 29954156963 (both) — BACK_INDEX / delete from thread

    it('MM-T112 - should delete parent message and reply when parent is deleted from reply thread', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, message);
        await waitFor(parentPostListPostItem).toExist().withTimeout(timeouts.FOUR_SEC);

        // # Tap message to open in reply thread view
        await parentPostListPostItem.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Type a reply and post
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await waitFor(replyPostListPostItem).toExist().withTimeout(timeouts.FOUR_SEC);

        // # Wait for the thread UI to settle after posting the reply
        await wait(timeouts.TWO_SEC);

        // # While in thread view, long press the parent post (top post), select Delete and confirm
        await ThreadScreen.openPostOptionsFor(parentPost.id, message);
        await PostOptionsScreen.deletePost({confirm: true});
        await wait(timeouts.TWO_SEC);

        // * Verify both parent and reply disappear from channel
        await waitFor(replyPostListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen (thread auto-closes after parent post deletion)
        await ChannelScreen.back();
    });
});
