// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    it('MM-T3391 should render autocomplete in post edit screen', async () => {
        const message = Date.now().toString();

        // # Type a message
        const postInput = await element(by.id('post_input'));
        await postInput.tap();
        await postInput.typeText(message);

        // # Tap the send button
        await element(by.id('send_button')).tap();

        // # Open edit screen
        await element(by.text(message)).longPress();
        await element(by.text('Edit')).tap();

        // # Open autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await element(by.id('edit_post.input')).typeText(' @');

        // * Expect at_mention autocomplete to render
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();
    });
});
