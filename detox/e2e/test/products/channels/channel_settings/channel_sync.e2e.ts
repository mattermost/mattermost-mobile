// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T853: Device sync when creating channel
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T853 - Device sync when creating channel', async () => {
        // # Step 1: Have the *same account* viewing the same team open in two different devices (can be two browsers, desktop app, RN, mobile app)
        // Note: Multi-device testing is simulated via API creating a channel that syncs to the mobile device

        // # Step 2: In one of them create a public channel using the + icon in LHS
        // * The channel appears in the left hand sidebar for all devices as soon it gets created in the other device
        const channelName = `sync-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Wait for sync
        await wait(timeouts.TEN_SEC);

        // Verify the channel appears in the channel list
        await ChannelListScreen.open();
        await wait(timeouts.TWO_SEC);

        // The channel should be visible in the channel list after sync
        // We can open it to verify it synced
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.toBeVisible();

        // Open the newly synced channel
        await ChannelScreen.open('public', channel.display_name);
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);

        // Go back to channel list
        await ChannelScreen.back();
    });
});
