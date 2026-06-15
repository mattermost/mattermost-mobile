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
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Channel Post List', () => {
    const serverOneDisplayName = 'Server 1';
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

    it('MM-T4773_1 - should match elements on channel screen', async () => {
        // # Open a channel screen
        await ChannelScreen.open('channels', testChannel.name);

        // * Verify basic elements on channel screen
        await expect(ChannelScreen.backButton).toExist();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await waitFor(ChannelScreen.introDisplayName).toExist().withTimeout(timeouts.TWO_SEC);
        await expect(ChannelScreen.introDisplayName).toHaveText(testChannel.display_name);
        await expect(ChannelScreen.introSetHeaderAction).toExist();
        await expect(ChannelScreen.introChannelInfoAction).toExist();
        await expect(ChannelScreen.postList.getFlatList()).toExist();
        await expect(ChannelScreen.postDraft).toExist();
        await expect(ChannelScreen.postInput).toExist();
        await expect(ChannelScreen.atInputQuickAction).toExist();
        await expect(ChannelScreen.slashInputQuickAction).toExist();

        // # Tap on attachment action to open file attachment options
        const attachmentAction = element(by.id('channel.post_draft.quick_actions.attachment_action'));
        await expect(attachmentAction).toExist();
        await attachmentAction.tap();

        // * Verify file attachment options screen and its options
        const attachmentScreen = element(by.id('channel.post_draft.quick_actions.attachment_action.screen'));
        await expect(attachmentScreen).toExist();
        await expect(element(by.id('file_attachment.photo_library'))).toExist();
        await expect(element(by.id('file_attachment.take_photo'))).toExist();
        await expect(element(by.id('file_attachment.take_video'))).toExist();
        await expect(element(by.id('file_attachment.attach_file'))).toExist();

        // # Close attachment options by swiping down (works on both iOS and Android)
        await attachmentScreen.swipe('down', 'fast', 0.5);

        await expect(ChannelScreen.sendButtonDisabled).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4773_2 - should be able to add a message to post list and delete a message from post list', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open('channels', testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Open post options for the message that was just posted, tap delete option and confirm
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify message is deleted from post list
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
