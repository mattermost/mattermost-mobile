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
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - Slash Suggestion', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const slashCommand = 'away';
    let slashSuggestionAutocomplete: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);

        ({slashSuggestionItem: slashSuggestionAutocomplete} = Autocomplete.getSlashSuggestionItem(slashCommand));

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, channel.name);
    });

    beforeEach(async () => {
        // # Clear post input
        await ChannelScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        // # Log out
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4881_1 - should suggest slash command based on slash command name', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in slash command name
        await ChannelScreen.postInput.typeText(slashCommand);

        // * Verify slash suggestion autocomplete contains associated slash command suggestion
        await expect(slashSuggestionAutocomplete).toBeVisible();
    });

    it('MM-T4881_2 - should suggest slash command based on partial slash command name', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in partial slash command name
        await ChannelScreen.postInput.typeText(`${slashCommand.substring(0, slashCommand.length - 2)}`);

        // * Verify slash suggestion autocomplete contains associated slash command suggestion
        await expect(slashSuggestionAutocomplete).toBeVisible();
    });

    it('MM-T4881_3 - should stop suggesting slash command after uppercase slash command name', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in uppercase slash command name
        await ChannelScreen.postInput.typeText(slashCommand.toUpperCase());

        // * Verify slash suggestion autocomplete does not contain associated slash command suggestion
        await expect(slashSuggestionAutocomplete).not.toBeVisible();
    });

    it('MM-T4881_4 - should stop suggesting slash command after slash command name with trailing space', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in slash command name
        await ChannelScreen.postInput.typeText(slashCommand);

        // * Verify slash suggestion autocomplete contains associated slash command suggestion
        await expect(slashSuggestionAutocomplete).toBeVisible();

        // # Type in trailing space
        await ChannelScreen.postInput.typeText(' ');
        await wait(timeouts.ONE_SEC);

        // * Verify slash suggestion autocomplete does not contain associated slash command suggestion
        await expect(slashSuggestionAutocomplete).not.toBeVisible();
    });

    it('MM-T4881_5 - should stop suggesting slash command when keyword is not associated with any slash command', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in keyword not associated with any slash command
        await ChannelScreen.postInput.typeText(getRandomId());

        // * Verify slash suggestion autocomplete does not contain associated slash command suggestion
        await expect(slashSuggestionAutocomplete).not.toBeVisible();
    });

    it('MM-T4881_6 - should not be able to select slash suggestion multiple times', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await expect(Autocomplete.flatSlashSuggestionList).not.toBeVisible();
        await ChannelScreen.postInput.typeText('/');

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in slash command name and tap on slash suggestion autocomplete
        await ChannelScreen.postInput.typeText(slashCommand);
        await slashSuggestionAutocomplete.tap();

        // * Verify slash suggestion list disappears
        await waitFor(Autocomplete.flatSlashSuggestionList).not.toExist().withTimeout(timeouts.FOUR_SEC);

        // # Type in "/" again to re-activate slash suggestion list
        await ChannelScreen.postInput.typeText('/');

        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatSlashSuggestionList).not.toBeVisible();
    });
});
