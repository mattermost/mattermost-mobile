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
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Messaging - Message Post', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // # Ensure channel has propagated to the sidebar before any test runs.
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T72 - should highlight @here. @all. @channel. even when followed by a period', async () => {
        // # Open a channel screen and post a message with @here followed by a period
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('@here. Some text');

        // * Verify the post exists in the channel and @here is rendered (period is not part of the highlighted mention)
        const {post: atHerePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atHerePostItem} = ChannelScreen.getPostListPostItem(atHerePost.id, '@here. Some text');
        await expect(atHerePostItem).toBeVisible();

        // # Post a message with @all followed by a period
        await ChannelScreen.postMessage('@all. Some text');

        // * Verify the @all mention text is present in the post
        const {post: atAllPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atAllPostItem} = ChannelScreen.getPostListPostItem(atAllPost.id, '@all. Some text');
        await expect(atAllPostItem).toBeVisible();

        // # Post a message with @channel followed by a period
        await ChannelScreen.postMessage('@channel. Some text');

        // * Verify the @channel mention text is present in the post
        const {post: atChannelPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: atChannelPostItem} = ChannelScreen.getPostListPostItem(atChannelPost.id, '@channel. Some text');
        await expect(atChannelPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
