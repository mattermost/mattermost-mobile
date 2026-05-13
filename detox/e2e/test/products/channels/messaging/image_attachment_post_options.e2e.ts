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
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Image Attachment Post Options', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('MM-T1749 - should not show Copy Text option when long pressing an image-only post', async () => {
        // # Upload an image and create the post backdated 6 minutes so MM-T1750's post
        // (created at current time) will NOT be consecutive with this one (threshold is 5 min).
        // Consecutive posts hide the post header, making post_header.date_time unavailable.
        const imagePath = require('path').resolve(__dirname, '../../../../support/fixtures/image.png');
        const {fileId: uploadedFileId} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, imagePath);
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: '',
            fileIds: [uploadedFileId],
            createAt: Date.now() - (6 * 60 * 1000),
        });

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the post with the image attachment is visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long press the post timestamp (plain Text with no gesture handler) so the gesture
        // bubbles to the outer post TouchableHighlight and fires showPostOptions.
        // The image area itself has nested TouchableHighlight that intercepts gestures.
        const postDateTime = element(
            by.id('post_header.date_time').withAncestor(by.id(`channel.post_list.post.${post.id}`)),
        );
        await waitFor(postDateTime).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postDateTime.longPress(2000);
        await PostOptionsScreen.toBeVisible();

        // * Verify Copy Text option is NOT present in the post options menu
        await expect(PostOptionsScreen.copyTextOption).not.toBeVisible();

        // # Close post options and go back
        await PostOptionsScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T1750 - should not show Copy Text option when long pressing an image-only post in thread view', async () => {
        // # Upload an image and create a post with only that image (no message text) via API
        const {post} = await Post.apiCreatePostWithImageAttachment(siteOneUrl, testChannel.id);

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify the post with the image attachment is visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long press the post timestamp to trigger post options (bubbles to outer TouchableHighlight)
        const postDateTimeInChannel = element(
            by.id('post_header.date_time').withAncestor(by.id(`channel.post_list.post.${post.id}`)),
        );
        await waitFor(postDateTimeInChannel).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postDateTimeInChannel.longPress(2000);
        await PostOptionsScreen.toBeVisible();

        // # Tap "Reply" to open the thread view
        await PostOptionsScreen.replyPostOption.tap();
        await ThreadScreen.toBeVisible();

        // # Long press the post timestamp in thread view to trigger post options
        await wait(timeouts.TWO_SEC);
        const postDateTimeInThread = element(
            by.id('post_header.date_time').withAncestor(by.id(`thread.post_list.post.${post.id}`)),
        );
        await waitFor(postDateTimeInThread).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postDateTimeInThread.longPress(2000);
        await PostOptionsScreen.toBeVisible();

        // * Verify Copy Text option is NOT present in the post options menu
        await expect(PostOptionsScreen.copyTextOption).not.toBeVisible();

        // # Close post options, go back to channel, and return to channel list
        await PostOptionsScreen.close();
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
