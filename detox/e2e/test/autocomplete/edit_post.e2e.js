// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Autocomplete} from '@support/ui/component';
import {ChannelScreen, EditPostScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3391 should render autocomplete in post edit screen', async () => {
        const message = Date.now().toString();
        const {postInput, sendButton} = ChannelScreen;

        // # Type a message
        await postInput.tap();
        await postInput.typeText(message);

        // # Tap the send button
        await sendButton.tap();

        // # Explicitly wait on Android before verifying error message
        if (isAndroid()) {
            await wait(timeouts.ONE_SEC);
        }

        // # Open edit screen
        await EditPostScreen.open(message);

        const {atMentionSuggestionList} = Autocomplete;
        const {editPostInput, editPostClose} = EditPostScreen;

        // # Open autocomplete
        await expect(atMentionSuggestionList).not.toExist();
        await editPostInput.typeText(' @');

        // * Expect at_mention autocomplete to render
        await expect(atMentionSuggestionList).toExist();

        // # Close edit post screen
        await editPostClose.tap();
    });
});
