// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-T3391 should render autocomplete in post edit screen', async () => {
        const message = Date.now().toString();

        // # Type a message
        const postInput = await element(by.id('post_input'));
        await postInput.tap();
        await postInput.typeText(message);

        // # Tap the send button
        await element(by.id('send_button')).tap();

        // # Explicitly wait on Android before verifying error message
        if (isAndroid()) {
            await wait(timeouts.ONE_SEC);
        }

        // # Open edit screen
        await element(by.text(message)).longPress();

        // # Swipe up panel on Android
        if (isAndroid()) {
            const slide = element(by.id('slide_up_panel'));
            await slide.swipe('up');
        }

        const edit = element(by.text('Edit'));
        await edit.tap();

        // # Open autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await element(by.id('edit_post.input')).typeText(' @');

        // * Expect at_mention autocomplete to render
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Close edit post screen
        await element(by.id('edit_post.close')).tap();
    });
});
