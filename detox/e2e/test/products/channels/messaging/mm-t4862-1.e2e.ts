// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import client from '@support/server_api/client';
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
    ReactionsScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, safeEnableSynchronization, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emojis and Reactions', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
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

    it('MM-T4862_1 - should be able to view recent reactions and add new reaction via post options', async () => {
        // # Open a channel screen, post a message, and open post options for message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);

        // * Verify six default reactions are displayed
        await expect(PostOptionsScreen.getReactionEmoji('+1')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('smiley')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('white_check_mark')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('heart')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('eyes')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('raised_hands')).toBeVisible();

        // # Open emoji picker screen and add a new reaction
        await EmojiPickerScreen.open();
        await device.disableSynchronization();
        try {
            await EmojiPickerScreen.searchInput.replaceText('clown_face');
            await EmojiPickerScreen.searchInput.tapReturnKey();
            await waitFor(element(by.text('🤡'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await element(by.text('🤡')).tap();
        } finally {
            await safeEnableSynchronization();
        }

        // * Verify new reaction is added to the message
        const reactionElement = element(by.text('🤡').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await waitFor(reactionElement).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(reactionElement).toExist();

        // # Open post options for message
        await ChannelScreen.openPostOptionsFor(post.id, message);

        // * Verify recent reactions are displayed, newest reaction first and then the first five default reactions
        await expect(PostOptionsScreen.getReactionEmoji('clown_face')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('+1')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('smiley')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('white_check_mark')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('heart')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('eyes')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('raised_hands')).not.toBeVisible();

        // # Go back to channel list screen
        await PostOptionsScreen.close();
        await ChannelScreen.back();
    });
});
