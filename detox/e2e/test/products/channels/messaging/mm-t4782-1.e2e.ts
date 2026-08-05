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
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

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

    it('MM-T4782_1 - should be able to post a message when send button is tapped', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify send button is disabled
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Create a message draft
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);

        // * Verify send button is enabled
        await expect(ChannelScreen.sendButton).toBeVisible();

        // # Tap send button
        await ChannelScreen.sendButton.tap();

        // * Verify message is added to post list, cleared from post draft, and send button is disabled again
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();
        await expect(ChannelScreen.postInput).not.toHaveValue(message);
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
