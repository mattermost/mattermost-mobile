// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
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
        const {
            channelNavBarTitle,
            goToChannel,
        } = ChannelScreen;

        // # Go to unread channel
        await goToChannel(newChannel.display_name);

        // # Go to the same channel again
        await goToChannel(newChannel.display_name);

        // * Verify sidebar menu is not open
        await expect(MainSidebar.mainSidebar).not.toBeVisible();

        // * Selected channel should remain the same
        await expect(channelNavBarTitle).toHaveText(newChannel.display_name);
    });
});
