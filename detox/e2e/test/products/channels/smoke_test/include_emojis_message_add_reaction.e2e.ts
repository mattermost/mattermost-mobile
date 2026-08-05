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
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Smoke Test - Messaging', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    // Skip both: CI run 30000635898 — iOS post-option actions are unhittable and Android cascades at channel setup.

    it('MM-T4786_3 - should be able to include emojis in a message and add reaction to a message', async () => {
        // # Open a channel screen and post a message that includes emojis
        const message = 'The quick brown fox :fox_face: jumps over the lazy dog :dog:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted with emojis (wait for post row by id — emoji text nodes can lag)
        const resolvedMessage = 'The quick brown fox 🦊 jumps over the lazy dog 🐶';
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!post?.id) {
            throw new Error('MM-T4786_3: expected post after emoji message');
        }
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, resolvedMessage);
        await waitForElementToExist(postListPostItem, timeouts.TWENTY_SEC);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message, open emoji picker screen, and add a reaction
        // Use openPostOptionsFor (longPressWithScrollRetry) instead of a raw longPress so that
        // the gesture is retried on Android if PostOptionsScreen doesn't appear on the first attempt.
        await ChannelScreen.openPostOptionsFor(post.id, resolvedMessage);
        await EmojiPickerScreen.open();

        await device.disableSynchronization();
        await EmojiPickerScreen.searchInput.replaceText('clown_face');
        await EmojiPickerScreen.searchInput.tapReturnKey();
        await waitFor(element(by.text('🤡'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await element(by.text('🤡')).tap();
        await device.enableSynchronization();

        // * Verify reaction is added to the message
        await waitFor(element(by.text('🤡').withAncestor(by.id(`channel.post_list.post.${post.id}`)))).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
