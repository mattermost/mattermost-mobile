// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import jestExpect from 'expect';

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Channels', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-T3201 Create public channel', async () => {
        // # Go to channel sidebar list
        await element(by.id('channel_drawer.button')).tap();

        // # Tap on + public channels
        await element(by.id('action_button_sidebar.channels')).tap();

        // * Expect a list of public channels, initially empty
        await expect(element(by.text('No more channels to join'))).toBeVisible();

        // # Tap to create new channel
        await element(by.id('public_channels.create.button')).tap();

        // * Expect a new screen to create a new public channel
        await expect(element(by.text('New Public Channel'))).toBeVisible();

        // # Fill data
        await element(by.id('edit_channel.name.input')).typeText('a');
        await attemptToTapButton('edit_channel.create.button');

        // * Expect to be in the same screen since the channel name must be longer
        await expect(element(by.id('edit_channel.name.input'))).toBeVisible();

        await element(by.id('edit_channel.name.input')).typeText('bc');
        await element(by.id('edit_channel.purpose.input')).typeText('This sentence has');
        await element(by.id('edit_channel.purpose.input')).tapReturnKey();
        await element(by.id('edit_channel.purpose.input')).typeText('multiple lines');
        await element(by.id('edit_channel.scroll')).scroll(200, 'down');
        await expect(element(by.id('edit_channel.header.input'))).toBeVisible();
        const expectedChannelHeader = 'I 🌮 love 🌮 tacos 🌮';
        await element(by.id('edit_channel.header.input')).replaceText(expectedChannelHeader);

        await element(by.id('edit_channel.create.button')).tap();

        const expectedChannelName = 'abc';
        const expectedPurpose = 'This sentence has\nmultiple lines';

        // * Expect a redirection to the created channel
        await expect(element(by.id('channel_intro.beginning.text'))).toHaveText('Beginning of ' + expectedChannelName);
        await element(by.id('channel.title.button')).tap();

        // * Expect to see channel header and purpose in channel info
        await expect(element(by.text(expectedChannelHeader))).toBeVisible();
        await expect(element(by.text(expectedPurpose))).toBeVisible();

        // # Close channel info screen
        await element(by.id('screen.channel_info.close')).tap();
    });
});

async function attemptToTapButton(id) {
    if (device.getPlatform() === 'ios') {
        const attributes = await element(by.id(id)).getAttributes();
        jestExpect(attributes.visible).toEqual(true);
        jestExpect(attributes.enabled).toEqual(false);
    } else {
        await element(by.id(id)).tap();
    }
}
