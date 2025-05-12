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
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Follow and Unfollow Message', () => {
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

    it('MM-T4863_1 - should be able to follow/unfollow a message via post options', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message and tap on follow message option
        await postListPostItem.longPress(timeouts.ONE_SEC);
        await PostOptionsScreen.followThreadOption.tap();

        // * Verify message is followed by user via post footer
        const {postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemFooterFollowingButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unfollow message option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.followingThreadOption.tap();

        // * Verify message is not followed by user via post footer
        await waitFor(postListPostItemFooterFollowingButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);

        await wait(timeouts.TWO_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4863_2 - should be able to unfollow a message via post footer', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on follow message option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.followThreadOption.tap();

        // * Verify message is followed by user via post footer
        const {postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemFooterFollowingButton).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Tap on following button via post footer
        await postListPostItemFooterFollowingButton.tap();

        // * Verify message is not followed by user via post footer
        await waitFor(postListPostItemFooterFollowingButton).not.toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
