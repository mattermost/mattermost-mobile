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
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - Edit Post', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen, post a message, open post options for message, and open edit post screen
        const message = `Messsage ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, channel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await EditPostScreen.open();
    });

    beforeEach(async () => {
        // # Clear message input
        await EditPostScreen.messageInput.clearText();
    });

    afterAll(async () => {
        // # Log out
        await EditPostScreen.close();
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4883_1 - should render at-mention autocomplete in message input', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toBeVisible();

        // # Type in "@" to activate at-mention autocomplete
        await EditPostScreen.messageInput.typeText('@');

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();
    });

    it('MM-T4883_2 - should render channel mention autocomplete in message input', async () => {
        // * Verify channel mention list is not displayed
        await expect(Autocomplete.sectionChannelMentionList).not.toBeVisible();

        // # Type in "~" to activate channel mention autocomplete
        await EditPostScreen.messageInput.typeText('~');

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toBeVisible();
    });

    it('MM-T4883_3 - should render emoji suggestion autocomplete in message input', async () => {
        // * Verify emoji suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in ":" followed by 2 characters to activate emoji suggestion autocomplete
        await EditPostScreen.messageInput.typeText(':sm');

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();
    });

    it('MM-T4883_4 - should not render slash suggestion autocomplete in message input', async () => {
        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in "/" to activate slash suggestion autocomplete
        await EditPostScreen.messageInput.typeText('/');

        // * Verify slash suggestion list is still not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();
    });
});
