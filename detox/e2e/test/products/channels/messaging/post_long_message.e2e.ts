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
import {isAndroid, timeouts, wait} from '@support/utils';
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

    it('MM-T4782_2 - should be able to post a long message', async () => {
        // # Open a channel screen and post a long message
        const longMessage = 'The quick brown fox jumps over the lazy dog.'.repeat(40);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(longMessage);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the long post exists — use toExist (not toBeVisible) since the post is taller
        // than the viewport and fails the 75% visibility threshold even when on-screen.
        const {postListPostItem, postListPostItemShowLessButton, postListPostItemShowMoreButton} = ChannelScreen.getPostListPostItem(post.id, longMessage);
        await expect(postListPostItem).toExist();

        // # Dismiss Android keyboard so the show-more button isn't hidden behind the draft input.
        // Show-more requires multiple layout cycles to appear, so wait up to 10s.
        if (isAndroid()) {
            await device.pressBack();
        }
        await waitFor(postListPostItemShowMoreButton).toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap on show more button on long message post.
        await postListPostItemShowMoreButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify long message post displays show less button (chevron up button)
        await waitFor(postListPostItemShowLessButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Post a short message and go back to channel list screen
        await ChannelScreen.postMessage('short message');
        await ChannelScreen.back();
    });
});
