// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - Thread Post Draft', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen, post a message, and tap on post to open reply thread
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelScreen.postMessage(message);
        await element(by.text(message)).tap();
    });

    beforeEach(async () => {
        // # Clear post input
        await ThreadScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        // # Log out
        await ThreadScreen.back();
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4905_1 - should render at-mention autocomplete in post input', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toBeVisible();

        // # Type in "@" to activate at-mention autocomplete
        await ThreadScreen.postInput.typeText('@');

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();
    });

    it('MM-T4905_2 - should render channel mention autocomplete in post input', async () => {
        // * Verify channel mention list is not displayed
        await expect(Autocomplete.sectionChannelMentionList).not.toBeVisible();

        // # Type in "~" to activate channel mention autocomplete
        await ThreadScreen.postInput.typeText('~');

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toBeVisible();
    });

    it('MM-T4905_3 - should render emoji suggestion autocomplete in post input', async () => {
        // * Verify emoji suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in ":" followed by 2 characters to activate emoji suggestion autocomplete
        await ThreadScreen.postInput.typeText(':sm');

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();
    });

    it('MM-T4905_4 - should render slash suggestion autocomplete in post input', async () => {
        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatSlashSuggestionList).not.toBeVisible();

        // # Type in "/" to activate slash suggestion autocomplete
        await ThreadScreen.postInput.typeText('/');

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();
    });
});
