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
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, safeEnableSynchronization, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emojis and Reactions', () => {

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

    // Skip iOS: CI run 30000635898 — emoji picker search input is visible but not hittable.

    // Skip iOS: CI run 30000635898 — emoji picker search input is visible but not hittable.

    (isIos() ? it.skip : it)('MM-T4862_3 - should be able to include emojis in a message and be able to find them in emoji bar and recently used section', async () => {
        // # Open a channel screen and post a message that includes emojis
        const message = 'brown fox :fox_face: lazy dog :dog:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted with emojis
        const resolvedMessage = 'brown fox 🦊 lazy dog 🐶';
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, resolvedMessage);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message
        await ChannelScreen.openPostOptionsFor(post.id, resolvedMessage);
        await PostOptionsScreen.toBeVisible();

        // * Verify emojis exist in emoji bar
        await expect(element(by.text('🦊'))).toExist();
        await expect(element(by.text('🐶'))).toExist();

        // # Open emoji picker screen
        await EmojiPickerScreen.open();
        await device.disableSynchronization();
        try {
            // Wait for emoji search input to be fully rendered and hittable
            await waitFor(EmojiPickerScreen.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

            // * Verify emojis exist in recently used section
            await waitFor(element(by.text('RECENTLY USED')).atIndex(0)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await expect(element(by.text('🦊')).atIndex(0)).toExist();
            await expect(element(by.text('🐶')).atIndex(0)).toExist();
        } finally {
            await safeEnableSynchronization();
        }

        // # Go back to channel list screen
        await EmojiPickerScreen.close();
        await ChannelScreen.back();
    });
});
