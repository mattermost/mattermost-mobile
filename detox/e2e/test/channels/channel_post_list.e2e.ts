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
import {getRandomId, isAndroid} from '@support/utils';
import {expect} from 'detox';

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
        if (isAndroid()) {
            await ChannelScreen.back();
            await ChannelScreen.open('channels', testChannel.name);
        }

        // * Verify basic elements on channel screen
        await expect(ChannelScreen.backButton).toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(testChannel.display_name);
        await expect(ChannelScreen.introSetHeaderAction).toBeVisible();
        await expect(ChannelScreen.introChannelInfoAction).toBeVisible();
        await expect(ChannelScreen.postList.getFlatList()).toBeVisible();
        await expect(ChannelScreen.postDraft).toBeVisible();
        await expect(ChannelScreen.postInput).toBeVisible();
        await expect(ChannelScreen.atInputQuickAction).toBeVisible();
        await expect(ChannelScreen.slashInputQuickAction).toBeVisible();
        await expect(ChannelScreen.fileQuickAction).toBeVisible();
        await expect(ChannelScreen.imageQuickAction).toBeVisible();
        await expect(ChannelScreen.cameraQuickAction).toBeVisible();
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4773_2 - should be able to add a message to post list and delete a message from post list', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open('channels', testChannel.name);
        if (isAndroid()) {
            await ChannelScreen.back();
            await ChannelScreen.open('channels', testChannel.name);
        }
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for the message that was just posted, tap delete option and confirm
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify message is deleted from post list
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
