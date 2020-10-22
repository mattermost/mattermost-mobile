// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Messaging', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('should post a message on tap to paper send button', async () => {
        await expect(element(by.id('channel_screen'))).toBeVisible();
        await expect(element(by.id('post_input'))).toExist();
        await expect(element(by.id('send_button'))).not.toExist();
        await element(by.id('post_input')).tap();

        const text = Date.now().toString();
        await element(by.id('post_input')).typeText(text);

        await expect(element(by.id('send_button'))).toBeVisible();
        await element(by.id('send_button')).tap();

        await expect(element(by.text(text))).toExist();
    });
});
