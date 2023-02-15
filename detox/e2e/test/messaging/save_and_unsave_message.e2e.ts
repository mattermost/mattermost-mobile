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
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Save and Unsave Message', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
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

    it('MM-T4864_1 - should be able to save/unsave a message via post options on channel screen', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message and tap on save option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // * Verify saved text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Open post options for message and tap on unsave option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.unsavePostOption.tap();

        // * Verify saved text is not displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        await expect(postListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4864_2 - should be able to save/unsave a message via post options on thread screen', async () => {
        // # Open a channel screen, post a message, tap on post to open thread, open post options for message, and tap on save option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await postListPostItem.tap();
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // * Verify saved text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Open post options for message and tap on unsave option
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.unsavePostOption.tap();

        // * Verify saved text is not displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        await expect(postListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
