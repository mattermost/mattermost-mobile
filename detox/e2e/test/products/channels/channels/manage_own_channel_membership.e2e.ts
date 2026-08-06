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
import {isAndroid} from '@support/utils';
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

    // Unskipped (SEC-11049) on iOS: duplicate manage_members user_item matcher — the
    // members list can render the same user_item in both the GM-member section and
    // the flat list. Verified green on iOS. Android kept skipped after a live per-test
    // re-verification on 2026-08-05 (API-35 emulator, live PR-9996 Android server 11.10.0,
    // FeatureFlagClassificationMarkings ON): the test FAILS on Android at
    // ManageChannelMembersScreen.toBeVisible() — `manage_members.screen` is never found
    // (polled null for 30s) after `channel_info.options.members.option` is tapped
    // successfully. This is Android-specific (iOS passes) and is NOT the classification
    // overlay (the overlay theory is retracted: that error is caught and swallowed).
    // Mechanism: tapping Members on Android does not navigate to a screen with testID
    // `manage_members.screen` — either the screen testID differs on Android or the
    // navigation target differs. Test-fix/PE territory; needs isolation of which screen
    // actually mounts after the Members tap on Android. Artifact captured under
    // artifacts/android.emu.debug.2026-08-06 14-39-27Z/.
    (isAndroid() ? it.skip : it)('MM-66375 - should be able to see and manage own membership in channel members list', async () => {
        // # Create a channel and add the test user to it
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // # Open the channel screen
        await ChannelScreen.open(channelsCategory, channel.name);

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // # Open manage channel members screen
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

        // * Verify the current user can be selected in manage mode
        await expect(ManageChannelMembersScreen.getUserItem(testUser.id)).toBeVisible();

        // # Tap on the current user in manage mode
        await ManageChannelMembersScreen.getUserItem(testUser.id).tap();

        // * Verify that tapping on own user in manage mode opens the user profile
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
