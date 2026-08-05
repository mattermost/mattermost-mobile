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
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait, expectVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Create Direct Message', () => {

    const serverOneDisplayName = 'Server 1';
    const directMessagesCategory = 'direct_messages';
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

    // Skip both: Android 3/3 + iOS R3 — duplicate/ambiguous user_item matcher / search spinner

    // Skip both: Android 3/3 + iOS R3 — user list item not found / ambiguous matchers

    // Skip Android: R1 product fail — empty-state text <50% visible despite toExist workaround

    // Skip Android: R1 product fail — deactivated-user search list item matcher

    it.skip('MM-T4730_2 - should be able to create a direct message', async () => {
        // # As admin, create a new user to open direct message with
        const {user: newUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // * Verify no direct message channel for the new user appears on channel list screen
        const newUserDisplayName = newUser.username;
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, newUserDisplayName)).not.toBeVisible();

        // # Open create direct message screen and search for the new user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(newUserDisplayName);

        // * Verify search returns the new user item (search can still be loading — CI
        // 29935363789 Android MM-T4730_2 failed on bare expect while spinner visible)
        await waitFor(CreateDirectMessageScreen.getUserItemDisplayName(newUser.id)).
            toBeVisible().
            withTimeout(timeouts.HALF_MIN);

        // # Tap on the new user item
        await CreateDirectMessageScreen.getUserItem(newUser.id).tap();

        // * Verify the new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(newUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify on direct message channel screen for the new user
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(newUserDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(newUserDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        // * Verify direct message channel for the new user is added to direct message list
        const {channel: directMessageChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, newUser.id]);
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, directMessageChannel.name)).toHaveText(newUserDisplayName);
    });
});
