// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T851: RN apps Pinned Messages
 */

import {Channel, Post, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T851 - RN apps Pinned Messages', async () => {
        // # Setup: Create a test channel and post a message
        const channelName = `pinned-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        const messageText = 'This message will be pinned';
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: channel.id,
            message: messageText,
        });

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);
        await wait(timeouts.TWO_SEC);

        // # Step 1: Create a post and pin to channel (long press)
        // Pin the post via UI
        const postListPostItem = element(by.id(`post_list.post.${post.id}`));
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postListPostItem.longPress();
        await wait(timeouts.ONE_SEC);

        await PostOptionsScreen.toBeVisible();
        const pinPostOption = element(by.id('post_options.pin_post.option'));
        await expect(pinPostOption).toBeVisible();
        await pinPostOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Step 2: Tap on the Channel name to view info
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 3: Select Pinned Messages
        // * Opens Pinned Messages list
        await expect(ChannelInfoScreen.pinnedMessagesOption).toBeVisible();
        await ChannelInfoScreen.pinnedMessagesOption.tap();
        await wait(timeouts.TWO_SEC);

        await PinnedMessagesScreen.toBeVisible();

        // Verify the pinned message is visible
        await wait(timeouts.TWO_SEC);
        await PinnedMessagesScreen.hasPostMessage(post.id, messageText);

        // Go back
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
