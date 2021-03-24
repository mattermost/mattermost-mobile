// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelScreen,
    ChannelInfoScreen,
    EditChannelScreen,
} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Edit Channel', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3199 should be able to edit public channel', async () => {
        const {
            editChannelScreen,
            headerInput,
            nameInput,
            purposeInput,
            saveButton,
        } = EditChannelScreen;
        const {
            headerDisplayName,
            headerPurpose,
        } = ChannelInfoScreen;

        // # Open edit channel screen
        await ChannelInfoScreen.open();
        await EditChannelScreen.open();

        // # Edit channel info
        await nameInput.typeText(' name');
        await purposeInput.typeText('purpose');
        await editChannelScreen.scrollTo('bottom');
        await headerInput.typeText('header1');
        await headerInput.tapReturnKey();
        await headerInput.typeText('header2');

        // # Save changes
        await saveButton.tap();

        // * Verify changes have been saved
        await expect(headerDisplayName).toHaveText('Town Square name');
        await expect(headerPurpose).toHaveText('purpose');
        await expect(element(by.text('header1\nheader2'))).toBeVisible();

        // # Close channel info screen
        await ChannelInfoScreen.close();
    });
});
