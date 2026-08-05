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
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

describe('Channels - Archive Channel', () => {

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

    // Skip Android: R1 product — archive confirm leaves unexpected SafeArea view matcher

    it('MM-T4932_2 - should be able to archive a public channel and cancel', async () => {
        // # Open a public channel screen, open channel info screen, go to channel settings, and tap on archive channel option and cancel
        const {channel: publicChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'O', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, publicChannel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: false});

        // * Verify still on channel settings screen
        await ChannelSettingsScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelSettingsScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
