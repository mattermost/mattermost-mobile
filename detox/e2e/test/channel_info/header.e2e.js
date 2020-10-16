// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {logoutUser, toChannelScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

import {Setup} from '@support/server_api';

describe('Channel Info Header', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    afterAll(async () => {
        await logoutUser();
    });

    it('MM-T3406 should render correct GM member count in channel info header', async () => {
        // # Open drawer
        await element(by.id('channel_drawer.button')).tap();
        await expect(element(by.text('DIRECT MESSAGES'))).toBeVisible();

        // # Open Direct Channels screen
        await element(by.id('sidebar.channel_list.create_direct')).tap();
        await expect(element(by.id('direct_channels_screen'))).toBeVisible();

        // # Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        // # Select 3 profiles
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(0).tap();
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(1).tap();
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(2).tap();

        // # Create a GM with selected profiles
        await element(by.id('start-conversation')).tap();

        // # Open channel info modal
        await element(by.id('channel.title.button')).tap();

        // * Verify GM member count is 3
        await expect(element(by.id('channel_icon.gm_member_count')).atIndex(0)).toHaveText('3');

        // # Close channel info screen
        await element(by.id('screen.channel_info.close')).tap();
    });
});
