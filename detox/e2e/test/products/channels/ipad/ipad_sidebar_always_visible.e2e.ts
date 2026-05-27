// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {isIpad, timeouts} from '@support/utils';
import {expect} from 'detox';

describe('iPad - Sidebar Always Visible', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-TIPAD_1 - should show the channel list sidebar without any swipe gesture on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the channel list screen is immediately visible (no swipe needed)
        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
    });

    it('MM-TIPAD_2 - should display the server display name in the channel list header on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the server display name is visible in the sidebar header
        await waitFor(ChannelListScreen.headerServerDisplayName).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.headerServerDisplayName).toBeVisible();
    });

    it('MM-TIPAD_3 - should show the team display name in the channel list header on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the team display name is visible in the sidebar header
        await waitFor(ChannelListScreen.headerTeamDisplayName).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.headerTeamDisplayName).toBeVisible();
    });

    it('MM-TIPAD_4 - should show the plus button in the channel list header on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the plus button is visible in the sidebar header
        await waitFor(ChannelListScreen.headerPlusButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.headerPlusButton).toBeVisible();
    });

    it('MM-TIPAD_5 - should show the threads button in the channel list sidebar on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // * Verify the threads button is visible without any gesture
        await waitFor(ChannelListScreen.threadsButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.threadsButton).toBeVisible();
    });
});
