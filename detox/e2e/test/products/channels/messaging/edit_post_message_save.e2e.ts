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
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Edit', () => {

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

    it('MM-T4783_1 - should be able to edit a post message and save', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: originalPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(originalPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Dismiss the keyboard so the just-posted message is not occluded (interactive
        // dismiss needs a downward drag, not a programmatic scroll).
        await ChannelScreen.dismissKeyboard();

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, message);

        // # Wait for the bottom-sheet edit option to fully slide in before tapping
        // (iOS 26.x can leave the row clipped mid-animation and fail with "not hittable").
        await waitFor(PostOptionsScreen.editPostOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.editPostOption.tap({x: 1, y: 1});

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.save();

        // # Dismiss the keyboard — try/catch because empty channel has no scroll overflow.
        // Use toExist below since channel-intro card pushes a single post under 75% visibility.
        try {
            await ChannelScreen.getFlatPostList().scroll(100, 'up', 0.5, 0.5);
        } catch { /* list at boundary — nothing to scroll */ }
        await wait(timeouts.ONE_SEC);

        const {postListPostItem: updatedPostListPostItem} = ChannelScreen.getPostListPostItem(post.id);
        await expect(updatedPostListPostItem).toExist();

        await ChannelScreen.assertPostMessageEdited(post.id, updatedMessage);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
