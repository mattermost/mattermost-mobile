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
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
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

    it('MM-T4786_1 - should be able to post, edit, and delete a message', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: originalPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(originalPostListPostItem).toBeVisible();

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await wait(timeouts.ONE_SEC);
        await EditPostScreen.saveButton.tap();

        await waitFor(EditPostScreen.editPostScreen).not.toExist().withTimeout(timeouts.TWENTY_SEC);

        // * Verify post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, updatedMessage);
        await ChannelScreen.assertPostMessageEdited(post.id, updatedMessage);

        // # Open post options for the updated message, tap delete option and confirm
        await element(by.id(`channel.post_list.post.${post.id}`)).longPress();
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify post message is deleted
        await expect(updatedPostListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
