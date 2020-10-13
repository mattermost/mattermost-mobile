// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    it('MM-T28539 should render autocomplete in channel header edit screen', async () => {
        // Open drawer
        await element(by.id('channel_drawer.button')).tap();
        await expect(element(by.text('DIRECT MESSAGES'))).toBeVisible();

        // Open Direct Channels screen
        await element(by.id('sidebar.channel_list.create_direct')).tap();
        await expect(element(by.id('direct_channels_screen'))).toBeVisible();

        // Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        // Select two profiles
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(0).tap();
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(1).tap();
        await element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(2).tap();

        // Create a GM with selected profiles
        await element(by.id('start-conversation')).tap();

        // # Open channel info modal
        await element(by.id('channel.title.button')).tap();

        await expect(element(by.id('channel_icon.gm_member_count'))).toHaveText('3');

        // close channel info screen
        await element(by.id('screen.channel_info.close')).tap();
    });
});
