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
import {expect} from 'detox';

describe('Channels - Convert to Private Channel', () => {
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

    it('MM-T4972_1 - should be able to convert public channel to private and confirm', async () => {
        // # Open a public channel screen, open channel info screen, and tap on convert to private channel option and confirm
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.convertToPrivateChannel(channel.display_name, {confirm: true});

        // * Verify on channel screen
        await ChannelScreen.toBeVisible();

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify convert to private channel option does not exist
        await expect(ChannelInfoScreen.convertPrivateOption).not.toExist();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4972_2 - should be able to convert public channel to private and cancel', async () => {
        // # Open a public channel screen, open channel info screen, and tap on convert to private channel option and cancel
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.convertToPrivateChannel(channel.display_name, {confirm: false});

        // * Verify still on channel info screen
        await ChannelInfoScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
