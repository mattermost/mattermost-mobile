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
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Leave Channel', () => {

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

    // Re-enabled iOS: Android 2/2 pass on CI 30250131265; prior iOS skip had no failure reason.

    it('MM-T4931_3 - should be able to leave a channel from channel quick actions', async () => {
        // # Open a channel screen, tap on channel quick actions button, and tap on leave channel option and confirm
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.leaveChannel({confirm: true});

        // * Verify on channel list screen and the channel left by the user does not appear on the list
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.getChannelItem(channelsCategory, channel.name)).not.toExist();
    });
});
