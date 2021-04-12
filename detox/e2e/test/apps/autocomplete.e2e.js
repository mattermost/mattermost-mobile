// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Autocomplete} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    let user;
    const {postInput} = ChannelScreen;
    const {slashSuggestionList} = Autocomplete;
    let userAtMentionAutocomplete;

    beforeAll(async () => {
        ({user} = await Setup.apiInit());

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    beforeEach(async () => {
        // # Clear text and verify that Autocomplete disappeared
        await postInput.clearText();
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3409_1 should suggest app command', async () => {
        // # Type "/" to activate slash command autocomplete
        await postInput.typeText('/');
        await Autocomplete.toBeVisible();
        await expect(slashSuggestionList).toExist();

        // # Type username
        await postInput.typeText('com.mattermost.servicenow');

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(slashSuggestionList).toExist();
    });
});
