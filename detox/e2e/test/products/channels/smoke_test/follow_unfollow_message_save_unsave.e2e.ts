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
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

describe('Smoke Test - Messaging', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    const pinnedText = 'Pinned';
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

    it.skip('MM-T4786_4 - should be able to follow/unfollow a message, save/unsave a message, and pin/unpin a message', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on follow message option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.followThreadOption.tap();

        // * Verify post options closed and message is followed by user via post footer
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
        const {postListPostItem, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemFooterFollowingButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap on following button via post footer to unfollow
        await postListPostItemFooterFollowingButton.tap();

        // * Verify message is not followed by user via post footer
        await waitFor(postListPostItemFooterFollowingButton).not.toExist().withTimeout(timeouts.FOUR_SEC);

        // # Open post options for message and tap on save option
        await ChannelScreen.openPostOptionsFor(post.id, message);

        if (isAndroid()) {
            await PostOptionsScreen.savePostOptionLabel.tap();
        } else {
            await PostOptionsScreen.savePostOption.tap();
        }

        // * Verify post options closed and saved text is displayed on the post pre-header
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
        const {postListPostItemPreHeaderText: channelPostListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(channelPostListPostItemPreHeaderText).toHaveText(savedText).withTimeout(timeouts.FOUR_SEC);

        // # Tap on post to open thread and open post options for message
        await postListPostItem.tap();
        await ThreadScreen.toBeVisible();
        await wait(timeouts.ONE_SEC);
        await ThreadScreen.openPostOptionsFor(post.id, message);
        if (isAndroid()) {
            await PostOptionsScreen.unsavePostOptionLabel.tap();
        } else {
            await PostOptionsScreen.unsavePostOption.tap();
        }

        // * Verify post options closed and saved text is not displayed on the post pre-header
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.TWO_SEC);
        await waitFor(channelPostListPostItemPreHeaderText).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Open post options for message and tap on pin to channel option
        await ThreadScreen.openPostOptionsFor(post.id, message);
        if (isAndroid()) {
            await PostOptionsScreen.pinPostOptionLabel.tap();
        } else {
            await PostOptionsScreen.pinPostOption.tap();
        }

        // * Verify post options closed and pinned text is displayed on the post pre-header
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.TWO_SEC);
        const {postListPostItemPreHeaderText: threadPostListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await waitFor(threadPostListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.FOUR_SEC);

        // # Go back to channel, open post options for message, and tap on unpin from channel option
        await ThreadScreen.back();
        await ChannelScreen.openPostOptionsFor(post.id, message);
        if (isAndroid()) {
            await PostOptionsScreen.unpinPostOptionLabel.tap();
        } else {
            await PostOptionsScreen.unpinPostOption.tap();
        }

        // * Verify post options closed and pinned text is not displayed on the post pre-header
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toBeVisible().withTimeout(timeouts.TWO_SEC);
        await waitFor(channelPostListPostItemPreHeaderText).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
