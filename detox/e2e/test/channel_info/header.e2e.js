// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelScreen,
    DirectChannelsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Channel Info Header', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3406 should render correct GM member count in channel info header', async () => {
        // # Open main sidebar
        await ChannelScreen.mainSidebarDrawerButton.tap();
        await MainSidebar.toBeVisible();

        // # Open Direct Channels screen
        await MainSidebar.addDirectChannel.tap();
        await DirectChannelsScreen.toBeVisible();

        // # Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        const {
            getUserAtIndex,
            startButton,
        } = DirectChannelsScreen;

        // # Select 3 profiles
        await getUserAtIndex(0).tap();
        await getUserAtIndex(1).tap();
        await getUserAtIndex(2).tap();

        // # Create a GM with selected profiles
        await startButton.tap();

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify GM member count is 3
        await expect(element(by.id(ChannelInfoScreen.testID.channelIconGMMemberCount)).atIndex(0)).toHaveText('3');

        // # Close channel info screen
        await ChannelInfoScreen.close();
    });
});
