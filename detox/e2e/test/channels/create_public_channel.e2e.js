// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Channels', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        await toChannelScreen(user);
    });

    it('MM-T3201 Create public channel', async () => {
        // go to channel sidebar list
        await element(by.id('channel_drawer_button')).tap();

        // tap on + public channels
        await element(by.id('action_button_sidebar.channels')).tap();

        // expect a list of public channels, initially empty
        await expect(element(by.text('No more channels to join'))).toBeVisible();

        // tap to create new channel
        await element(by.text('CREATE')).tap();

        // expect a new screen to create a new public channel
        await expect(element(by.text('New Public Channel'))).toBeVisible();

        // fill data
        await element(by.id('input_channel_name')).typeText('a');
        await element(by.text('CREATE')).tap();

        // the `Create` button is not tappable until at least 2 characters have been entered
        await expect(element(by.id('input_channel_name'))).toBeVisible();

        await element(by.id('input_channel_name')).typeText('bc');
        await element(by.id('input_channel_purpose')).typeText('This sentence has');
        await element(by.id('input_channel_purpose')).tapReturnKey();
        await element(by.id('input_channel_purpose')).typeText('multiple lines');
        await element(by.id('channel_scroll')).scroll(200, 'down');
        await expect(element(by.id('input_channel_header'))).toBeVisible();
        const expectedChannelHeader = 'I 🌮 love 🌮 tacos 🌮';
        await element(by.id('input_channel_header')).replaceText(expectedChannelHeader);

        await element(by.text('CREATE')).tap();

        const expectedChannelName = 'abc';
        const expectedPurpose = 'This sentence has\nmultiple lines';

        // expect a redirection to the created channel
        await expect(element(by.text('Beginning of ' + expectedChannelName))).toBeVisible();
        await element(by.text(expectedChannelName)).tap();

        // expect to see channel header and purpose in channel info
        await expect(element(by.text(expectedChannelHeader))).toBeVisible();
        await expect(element(by.text(expectedPurpose))).toBeVisible();
    });
});
