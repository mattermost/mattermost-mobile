// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelInfoScreen,
    ChannelScreen,
    MoreDirectMessagesScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Channel Info Header', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3406 should render correct GM member count in channel info header', async () => {
        // # Open more direct messages screen
        await ChannelScreen.openMainSidebar();
        await MoreDirectMessagesScreen.open();

        // # Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        const {
            getUserAtIndex,
            startButton,
        } = MoreDirectMessagesScreen;

        // # Select 3 profiles
        await getUserAtIndex(0).tap();
        await getUserAtIndex(1).tap();
        await getUserAtIndex(2).tap();

        // # Create a GM with selected profiles
        await startButton.tap();

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify GM member count is 3
        await expect(ChannelInfoScreen.headerChannelIconGMMemberCount).toHaveText('3');

        // # Close channel info screen
        await ChannelInfoScreen.close();
    });
});
