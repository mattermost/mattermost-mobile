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
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Large GIF Not Rendered', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const largeGifUrl = 'https://i.redd.it/ut25p64zbte21.gif';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Ensure clean state
        await device.reloadReactNative();
        await wait(timeouts.TWO_SEC);
        try {
            await HomeScreen.logout();
        } catch {
            // Not logged in — proceed to connect
        }

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

    it('MM-T343 - should show URL text only and not render a preview for large GIFs', async () => {
        // # Post the large GIF URL via API
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: largeGifUrl,
        });

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Wait for the post to be visible
        await wait(timeouts.TWO_SEC);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, largeGifUrl);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the URL text is visible in the post
        const urlText = element(by.text(largeGifUrl).withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await expect(urlText).toBeVisible();

        // * Verify the GIF is NOT rendered as an inline file attachment or image preview
        await expect(element(by.id(`${post.id}-file-container`))).not.toExist();
        await expect(element(by.id('image-row').withAncestor(by.id(`channel.post_list.post.${post.id}`)))).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
