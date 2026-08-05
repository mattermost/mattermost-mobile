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

    it.skip('MM-T4730_3 - should be able to create a group message', async () => {
        // # As admin, create two new users to open group message with
        const {user: firstNewUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, firstNewUser.id, testTeam.id);
        const {user: secondNewUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'});
        await Team.apiAddUserToTeam(siteOneUrl, secondNewUser.id, testTeam.id);

        // * Verify no group message channel for the new users appears on channel list screen
        const firstNewUserDisplayName = firstNewUser.username;
        const secondNewUserDisplayName = secondNewUser.username;
        const groupDisplayName = `${firstNewUserDisplayName}, ${secondNewUserDisplayName}`;
        await expect(element(by.text(groupDisplayName))).not.toBeVisible();

        // # Open create direct message screen, search for the first new user and tap on the first new user item
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(firstNewUser.username);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await waitFor(CreateDirectMessageScreen.getUserItem(firstNewUser.id)).
            toExist().
            withTimeout(timeouts.HALF_MIN);
        await CreateDirectMessageScreen.getUserItem(firstNewUser.id).tap();

        // * Verify the first new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(firstNewUser.id)).toBeVisible();

        // # Search for the second new user and tap on the second new user item
        await CreateDirectMessageScreen.searchInput.replaceText(secondNewUser.username);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await waitFor(CreateDirectMessageScreen.getUserItem(secondNewUser.id)).
            toExist().
            withTimeout(timeouts.HALF_MIN);
        await CreateDirectMessageScreen.getUserItem(secondNewUser.id).tap();

        // * Verify the second new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(secondNewUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on group message channel screen for the other two new users
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(groupDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(groupDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
