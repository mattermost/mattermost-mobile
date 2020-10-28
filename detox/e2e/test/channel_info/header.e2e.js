// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelSidebar} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelInfoScreen,
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
        // # Open drawer
        await ChannelScreen.channelDrawerButton.tap();
        await expect(element(by.text('DIRECT MESSAGES'))).toBeVisible();

        // # Open Direct Channels screen
        await ChannelSidebar.addDirectChannel.tap();
        await DirectChannelsScreen.toBeVisible();

        // # Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        const {dmUser, startButton} = DirectChannelsScreen;

        // # Select 3 profiles
        await dmUser.atIndex(0).tap();
        await dmUser.atIndex(1).tap();
        await dmUser.atIndex(2).tap();

        // # Create a GM with selected profiles
        await startButton.tap();

        // # Open channel info modal
        await ChannelInfoScreen.open();

        // * Verify GM member count is 3
        await expect(element(by.id(ChannelInfoScreen.testID.channelIconGMMemberCount)).atIndex(0)).toHaveText('3');

        // # Close channel info screen
        await ChannelInfoScreen.close();
    });
});
