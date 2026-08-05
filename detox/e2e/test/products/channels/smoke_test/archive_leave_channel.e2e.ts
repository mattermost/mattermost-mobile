// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {device} from 'detox';

describe('Smoke Test - Channels', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
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

    // Skip iOS: failed on CI 30437339535. The waitFor-polling fix added afterwards was never
    // exercised — its shard was cancelled on 30447839548 — so treat it as unverified. Android passes.

    it('MM-T4774_6 - should be able to archive and leave a channel', async () => {
        // # Open a channel screen, open channel info screen, go to channel settings, and tap on archive channel option and confirm
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});
    });
});
