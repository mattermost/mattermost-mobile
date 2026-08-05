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

    (isIos() ? it.skip : it)('MM-T4862_4 - should display empty search state for emoji picker', async () => {
        // # Open a channel screen, post a message, open post options for message, open emoji picker screen, and search for a non-existent emoji
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const searchTerm = 'blahblahblahblah';
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await EmojiPickerScreen.open();
        await device.disableSynchronization();
        try {
            // Wait for emoji search input to be fully rendered and hittable
            await waitFor(EmojiPickerScreen.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await EmojiPickerScreen.searchInput.replaceText(searchTerm);
            await EmojiPickerScreen.searchInput.tapReturnKey();

            // * Verify empty search state for emoji picker
            await waitFor(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.text('Check the spelling or try another search.'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } finally {
            await safeEnableSynchronization();
        }

        // # Go back to channel list screen
        await EmojiPickerScreen.close();
        await ChannelScreen.back();
    });
});
