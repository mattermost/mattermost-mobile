// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import jestExpect from 'expect';

import {ChannelSidebar} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelInfoScreen,
    CreateChannelScreen,
    MoreChannelsScreen,
} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Channels', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3201 Create public channel', async () => {
        // # Go to channel sidebar list
        await ChannelScreen.channelDrawerButton.tap();

        // # Tap on + public channels
        await ChannelSidebar.addChannel.tap();

        // * Expect a list of public channels, initially empty
        await MoreChannelsScreen.toBeVisible();
        await expect(element(by.text('No more channels to join'))).toBeVisible();

        // # Tap to create new channel
        await MoreChannelsScreen.publicChannelCreateButton.tap();

        // * Expect a new screen to create a new public channel
        const createChannelScreen = await CreateChannelScreen.toBeVisible();
        await expect(element(by.text('New Public Channel'))).toBeVisible();

        const {
            nameInput,
            purposeInput,
            headerInput,
        } = CreateChannelScreen;

        // # Fill data
        await nameInput.typeText('a');
        await attemptToTapButton('edit_channel.create.button');

        // * Expect to be in the same screen since the channel name must be longer
        await expect(nameInput).toBeVisible();

        await nameInput.typeText('bc');
        await purposeInput.typeText('This sentence has');
        await purposeInput.tapReturnKey();
        await purposeInput.typeText('multiple lines');
        await createChannelScreen.scroll(200, 'down');
        await expect(headerInput).toBeVisible();
        const expectedChannelHeader = 'I 🌮 love 🌮 tacos 🌮';
        await headerInput.replaceText(expectedChannelHeader);

        await CreateChannelScreen.createButton.tap();

        const expectedChannelName = 'abc';
        const expectedPurpose = 'This sentence has\nmultiple lines';

        // * Expect a redirection to the created channel
        await expect(ChannelScreen.channelIntro).toHaveText('Beginning of ' + expectedChannelName);

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Expect to see channel header and purpose in channel info
        await expect(element(by.text(expectedChannelHeader))).toBeVisible();
        await expect(element(by.text(expectedPurpose))).toBeVisible();

        // # Close channel info screen
        await ChannelInfoScreen.close();
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
