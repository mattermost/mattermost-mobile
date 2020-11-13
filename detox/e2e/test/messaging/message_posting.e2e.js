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

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3486 should post a message when send button is tapped', async () => {
        // * Verify channel screen is visible
        await ChannelScreen.toBeVisible();

        const {
            postInput,
            sendButton,
            sendButtonDisabled,
        } = ChannelScreen;

        // * Verify post input is visible and send button is disabled
        await expect(postInput).toBeVisible();
        await expect(sendButtonDisabled).toBeVisible();

        // # Tap on post input
        await postInput.tap();

        // # Type message on post input
        const message = Date.now().toString();
        await postInput.typeText(message);

        // * Verify send button is enabled
        await expect(sendButton).toBeVisible();

        // # Tap send button
        await sendButton.tap();

        // * Verify message is posted
        await expect(element(by.text(message))).toBeVisible();
    });
});
