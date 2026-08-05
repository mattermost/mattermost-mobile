// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Edit Channel', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testOtherUser1: any;
    let testOtherUser2: any;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        ({user: testOtherUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'}));
        if (!testOtherUser1?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser1');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser1.id, team.id);
        ({user: testOtherUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'}));
        if (!testOtherUser2?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser2');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser2.id, team.id);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    beforeEach(async () => {
        try {
            await ChannelScreen.toBeVisible();
        } catch {
            // Prior test may have failed mid-flow (e.g. Create DM tutorial blocking channel).
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
        }
    });

    afterAll(async () => {
        // A failed test can leave the app on a screen without the home tab, so opening the channel
        // list may fail here; logout handles navigation recovery.
        try {
            await ChannelListScreen.open();
        } catch {
            // App may be on a different screen; logout will navigate home.
        }
        await HomeScreen.logout();
    });

    it('MM-T4906_3 - should be able edit direct message channel', async () => {
        // # Create a direct message with another user
        await ChannelScreen.back();
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(testOtherUser1.username);
        await CreateDirectMessageScreen.getUserItem(testOtherUser1.id).tap();
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on direct message channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testOtherUser1.username);

        // # Open channel info screen, open edit channel header screen, edit channel info, and save changes
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannelHeader({fromChannelInfo: true});
        await CreateOrEditChannelScreen.headerInput.typeText('header1');
        await CreateOrEditChannelScreen.headerInput.tapReturnKey();
        await CreateOrEditChannelScreen.headerInput.typeText('header2');
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
        await ChannelInfoScreen.toBeVisible();
        await expect(element(by.text('header1\nheader2'))).toBeVisible();

        // # Go back to channel screen
        await ChannelInfoScreen.close();
    });
});
