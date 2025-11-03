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

describe('Autocomplete - Emoji Suggestion', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const emojiName = 'fox_face';
    const emojiNameFirst2Chars = emojiName.substring(0, 2);
    const emojiName3rdToLastChars = emojiName.substring(2);
    let emojiSuggestionAutocomplete: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);

        ({emojiSuggestionItem: emojiSuggestionAutocomplete} = Autocomplete.getEmojiSuggestionItem(emojiName));

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

    it('MM-T4880_1 - should suggest emoji based on emoji name', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in 3rd to last characters of emoji name
        await ChannelScreen.postInput.typeText(emojiName3rdToLastChars);

        // * Verify emoji suggestion autocomplete contains associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).toBeVisible();
    });

    it('MM-T4880_2 - should suggest emoji based on uppercase emoji name', async () => {
        // # Type in ":" then uppercase first 2 characters of emoji name to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars.toUpperCase()}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in uppercase 3rd to last characters of emoji name
        await ChannelScreen.postInput.typeText(emojiName3rdToLastChars.toUpperCase());

        // * Verify emoji suggestion autocomplete contains associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).toBeVisible();
    });

    it('MM-T4880_3 - should suggest emoji based on partial emoji name', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in partial emoji name
        await ChannelScreen.postInput.typeText(`${emojiName.substring(2, 4)}`);

        // * Verify emoji suggestion autocomplete contains associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).toBeVisible();
    });

    it('MM-T4880_4 - should stop suggesting emoji after emoji name with trailing space', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in 3rd to last characters of emoji name
        await ChannelScreen.postInput.typeText(emojiName3rdToLastChars);

        // * Verify emoji suggestion autocomplete contains associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).toBeVisible();

        // # Type in trailing space
        await ChannelScreen.postInput.typeText(' ');
        await wait(timeouts.ONE_SEC);

        // * Verify emoji suggestion autocomplete does not contain associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).not.toBeVisible();
    });

    it('MM-T4880_5 - should stop suggesting emoji when keyword is not associated with any emoji', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in keyword not associated with any emoji
        await ChannelScreen.postInput.typeText(getRandomId());

        // * Verify emoji suggestion autocomplete does not contain associated emoji suggestion
        await expect(emojiSuggestionAutocomplete).not.toBeVisible();
    });

    it('MM-T4880_6 - should be able to select emoji suggestion multiple times', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in 3rd to last characters of emoji name and tap on emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(emojiName3rdToLastChars);
        await emojiSuggestionAutocomplete.tap();

        // * Verify emoji suggestion list disappears
        await expect(Autocomplete.flatEmojiSuggestionList).not.toBeVisible();

        // # Type in ":" then first 2 characters of emoji name again to re-activate emoji suggestion list
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();
    });
});
