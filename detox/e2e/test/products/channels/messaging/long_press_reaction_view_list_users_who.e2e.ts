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
    ReactionsScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId, safeEnableSynchronization, timeouts} from '@support/utils';
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

    it('MM-T4862_2 - should be able to long press on a reaction to view the list of users who reacted', async () => {
        // # Open a channel screen, post a message, open post options for message, open emoji picker screen, and add a reaction
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await EmojiPickerScreen.open();
        await device.disableSynchronization();
        try {
            await EmojiPickerScreen.searchInput.replaceText('fire');
            await EmojiPickerScreen.searchInput.tapReturnKey();
            await waitFor(element(by.text('🔥'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await element(by.text('🔥')).tap();
        } finally {
            await safeEnableSynchronization();
        }

        // * Verify reaction is added to the message
        const reaction = element(by.text('🔥').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await waitFor(reaction).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(reaction).toExist();

        // # Long press on the reaction
        await reaction.longPress();

        // * Verify user who reacted with the emoji
        await ReactionsScreen.toBeVisible();
        const {reactorItemEmojiAliases, reactorItemUserProfilePicture, reactorItemUser} = ReactionsScreen.getReactorItem(testUser.id, 'fire');
        await expect(reactorItemEmojiAliases).toHaveText(':fire:');
        await expect(reactorItemUserProfilePicture).toExist();
        await expect(reactorItemUser).toBeVisible();
        await reactorItemUser.tap();
        await expect(UserProfileScreen.userDisplayName).toHaveText(`@${testUser.username}`);

        // # Go back to channel list screen
        await UserProfileScreen.close();
        await ChannelScreen.back();
    });
});
