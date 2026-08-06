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
import {getRandomId, isAndroid, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Message Reply', () => {

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

    afterEach(async () => {
        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip Android: CI run 30000635898 — the thread parent post is below the visibility threshold.

    (isAndroid() ? it.skip : it)('MM-T4785_3 - should not have reply option available on reply thread post options', async () => {
        // # Open a channel screen, post a message, and tap on the post
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await postListPostItem.tap();

        // * Verify on reply thread screen
        await ThreadScreen.toBeVisible();

        // # Open post options for the parent message
        await ThreadScreen.openPostOptionsFor(post.id, message);

        // * Verify reply option is not available
        await expect(PostOptionsScreen.replyPostOption).not.toExist();

        // # Go back to channel list screen
        await PostOptionsScreen.close();
        await ThreadScreen.back();
    });
});
