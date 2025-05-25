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
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - Create Channel', () => {
    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open create channel screen
        await CreateOrEditChannelScreen.openCreateChannel();
    });

    beforeEach(async () => {
        // # Clear header input
        await CreateOrEditChannelScreen.headerInput.clearText();
    });

    afterAll(async () => {
        // # Log out
        await CreateOrEditChannelScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T4904_1 - should render at-mention autocomplete in header input', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toBeVisible();

        // # Type in "@" to activate at-mention autocomplete
        await CreateOrEditChannelScreen.headerInput.typeText('@');

        // * Verify at-mention list is displayed
        await waitFor(Autocomplete.sectionAtMentionList).toBeVisible().withTimeout(timeouts.ONE_SEC);
    });

    it('MM-T4904_2 - should render channel mention autocomplete in header input', async () => {
        // * Verify channel mention list is not displayed
        await expect(Autocomplete.sectionChannelMentionList).not.toBeVisible();

        // # Type in "~" to activate channel mention autocomplete
        await CreateOrEditChannelScreen.headerInput.typeText('~');

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toBeVisible();
    });

    it('MM-T4904_3 - should render emoji suggestion autocomplete in header input', async () => {
        // * Verify emoji suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in ":" followed by 2 characters to activate emoji suggestion autocomplete
        await CreateOrEditChannelScreen.headerInput.typeText(':sm');

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();
    });

    it('MM-T4904_4 - should not render slash suggestion autocomplete in header input', async () => {
        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in "/" to activate slash suggestion autocomplete
        await CreateOrEditChannelScreen.headerInput.typeText('/');

        // * Verify slash suggestion list is still not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();
    });
});
