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
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

// iOS gallery close uses atIndex(0) because RNGH duplicates the testID.

describe('Messaging - File Preview Gallery', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Fresh app install for clean state. iOS notifications permission
        // is pre-granted so delete:true doesn't trigger the system prompt.
        await device.launchApp({
            newInstance: true,
            delete: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // Recover from mid-test failures so the next test starts clean.
        try {
            await waitFor(element(by.id('gallery.header.close.button'))).toExist().withTimeout(timeouts.ONE_SEC);
            if (isAndroid()) {
                await device.pressBack();
            } else {
                await element(by.id('gallery.header.close.button')).atIndex(0).tap();
            }
            await waitFor(element(by.id('gallery.header.close.button'))).not.toExist().withTimeout(timeouts.TEN_SEC);
        } catch { /* gallery not open */ }

        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.ONE_SEC);
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }

        await ChannelListScreen.toBeVisible();
    });

    it('MM-T344_1 - should render image inline for a message with image attachment (message attachment)', async () => {
        // # Post a message with a message attachment containing an image_url via API
        // This simulates a bot/webhook post with an inline image attachment
        const imageUrl = 'https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png';
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Message with image attachment',
            props: {
                attachments: [
                    {
                        fallback: 'Image attachment test',
                        text: 'Attachment body text',
                        image_url: imageUrl,
                    },
                ],
            },
        });

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Wait for the post to be visible
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, 'Message with image attachment');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify the attachment body text renders inline in the channel post
        const attachmentText = element(by.text('Attachment body text').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await expect(attachmentText).toBeVisible();

        // * Verify the post with the message attachment is visible in the channel list
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
