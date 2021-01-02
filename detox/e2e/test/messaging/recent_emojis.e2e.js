// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelScreen, AddReactionScreen} from '@support/ui/screen';
import {Setup} from '@support/server_api';
import {PostOptions} from '@support/ui/component';

describe('Messaging', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3495 should include post message emojis in Recent Emojis section and Recently Used section', async () => {
        // * Verify channel screen is visible
        await ChannelScreen.toBeVisible();

        const {
            postMessage,
        } = ChannelScreen;

        // # Type message on post input
        const message = 'The quick brown fox :fox_face: jumps over the lazy dog :dog:';
        await postMessage(message);

        // * Verify message is posted
        await expect(element(by.text('The quick brown fox 🦊 jumps over the lazy dog 🐶'))).toBeVisible();

        // # Open PostOptions
        await element(by.text('The quick brown fox 🦊 jumps over the lazy dog 🐶')).longPress();
        await PostOptions.toBeVisible();

        // * Verify emojis exist
        await expect(element(by.text('🦊'))).toExist();
        await expect(element(by.text('🐶'))).toExist();

        // # Open AddReaction screen
        await AddReactionScreen.open();

        // * Verify Emojis exist in recently used section
        await expect(element(by.text('🦊').withAncestor(by.id('RECENTLY USED')))).toExist();
        await expect(element(by.text('🐶').withAncestor(by.id('RECENTLY USED')))).toExist();

        // # Close AddReaction Screen
        await AddReactionScreen.close();
    });
});
