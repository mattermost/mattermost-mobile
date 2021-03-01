// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {isAndroid} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Select channel', () => {
    let newChannel;

    beforeAll(async () => {
        const {user, channel} = await Setup.apiInit();
        newChannel = channel;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3412 should close the sidebar menu when selecting the same channel', async () => {
        const {channelNavBarTitle} = ChannelScreen;

        // # Open main sidebar (with at least one unread channel)
        await ChannelScreen.openMainSidebar();

        // # Tap a channel to view it
        const channelItem = MainSidebar.getChannelByDisplayName(newChannel.display_name);
        await channelItem.tap();

        // * Selected channel should be visible
        await expect(channelNavBarTitle).toHaveText(newChannel.display_name);

        // # Open main sidebar again and select the same channel
        await ChannelScreen.openMainSidebar();
        await channelItem.tap();

        // * Drawer should not be visible on Android
        if (isAndroid()) {
            await expect(MainSidebar.mainSidebar).not.toBeVisible();
        }

        // * Selected channel should remain the same
        await expect(channelNavBarTitle).toHaveText(newChannel.display_name);
    });
});
