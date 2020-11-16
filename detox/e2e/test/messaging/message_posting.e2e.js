// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelScreen} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Messaging', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('should post a message on tap to paper send button', async () => {
        // * Verify channel screen is visible
        await ChannelScreen.toBeVisible();

        const {postInput, sendButton} = ChannelScreen;

        // * Post input should exist while send button should not
        await expect(postInput).toBeVisible();
        await expect(sendButton).not.toExist();

        // # Tap on post input
        await postInput.tap();

        // # Type text on post input
        const text = Date.now().toString();
        await postInput.typeText(text);

        // # Tap send button
        await expect(sendButton).toBeVisible();
        await sendButton.tap();

        // * Verify text to exist
        await expect(element(by.text(text))).toBeVisible();
    });
});
