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
    ChannelInfoScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Manage Own Channel Membership', () => {
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

    it('MM-66375 - should be able to see and manage own membership in channel members list', async () => {
        // # Create a channel and add the test user to it
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await device.reloadReactNative();

        // # Open the channel screen
        await ChannelScreen.open(channelsCategory, channel.name);

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // # Open manage channel members screen
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await wait(timeouts.ONE_SEC);
        await ManageChannelMembersScreen.open();

        // # Close tutorial
        await ManageChannelMembersScreen.closeTutorial();

        // * Verify manage channel members screen is visible
        await ManageChannelMembersScreen.toBeVisible();

        // * Verify the current user appears in the members list
        await expect(ManageChannelMembersScreen.getUserItemDisplayName(testUser.id)).toBeVisible();

        // # Enable manage mode
        await ManageChannelMembersScreen.toggleManageMode();

        // * Verify manage mode is enabled (done button should be visible)
        await expect(ManageChannelMembersScreen.doneButton).toBeVisible();

        // * Verify the current user can be selected in manage mode (they should have the manage mode icon visible)
        // The manage mode icon (chevron-down) should be visible for the current user
        await expect(ManageChannelMembersScreen.getUserItem(testUser.id)).toBeVisible();

        // # Tap on the current user in manage mode
        await ManageChannelMembersScreen.getUserItem(testUser.id).tap();

        // * Verify that tapping on own user in manage mode opens the user profile or shows manage options
        // This verifies that the restriction preventing users from managing their own membership has been removed
        await UserProfileScreen.toBeVisible();

        // # Close user profile screen
        await UserProfileScreen.close();

        // # Exit manage mode
        await ManageChannelMembersScreen.exitManageMode();

        // * Verify manage mode is disabled (manage button should be visible)
        await expect(ManageChannelMembersScreen.manageButton).toBeVisible();

        // # Go back to channel list screen
        await ManageChannelMembersScreen.close();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});

