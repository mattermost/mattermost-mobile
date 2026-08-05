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
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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

        // Ensure the channel has propagated to the sidebar before any test body runs.
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

    it('MM-T4864_1 - should be able to save/unsave a message via post options on channel screen', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Open post options for message and tap on save option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.tapSavePost();

        // * Verify saved text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        if (isAndroid()) {
            await waitForElementToExist(postListPostItemPreHeaderText, timeouts.TEN_SEC);
        }
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Open post options for message and tap on unsave option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.tapUnsavePost();

        // * Verify saved text is not displayed on the post pre-header
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
