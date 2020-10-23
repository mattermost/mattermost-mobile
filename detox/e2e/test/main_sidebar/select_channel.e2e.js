// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {isAndroid} from '@support/utils';
import {Setup} from '@support/server_api';

describe('Select channel', () => {
    let newChannel;

    beforeAll(async () => {
        const {user, channel} = await Setup.apiInit();
        newChannel = channel;

        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-T3412 should close the sidebar menu when selecting the same channel', async () => {
        // # Open channel drawer (with at least one unread channel)
        await element(by.id('channel_drawer.button')).tap();

        // * Main sidebar should be visible
        await expect(element(by.id('main_sidebar'))).toBeVisible();

        // # Tap a channel to view it
        await element(by.text(newChannel.display_name).withAncestor(by.id('channels_list'))).tap();

        // * Selected channel should be visible
        await expect(element(by.id('channel.nav_bar.title'))).toHaveText(newChannel.display_name);

        // # Open channel drawer again and select the same channel
        await element(by.id('channel_drawer.button')).tap();
        await element(by.text(newChannel.display_name).withAncestor(by.id('channels_list'))).tap();

        // * Drawer should not be visible on Android
        if (isAndroid()) {
            await expect(element(by.id('main_sidebar'))).not.toBeVisible();
        }
        
        // * Selected channel should remain the same
        await expect(element(by.id('channel.nav_bar.title'))).toHaveText(newChannel.display_name);
    });
});
