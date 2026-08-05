// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3195: RN apps Add members to channel
 * - MM-T856: Add existing users to public channel from drop-down Add Members
 * - MM-T3196: RN apps Manage members in channel
 * - MM-T3204: RN apps Add user to private channel
 * - MM-T3205: RN apps Remove user from private channel
 * - MM-T878: RN apps View Members in GM
 */

import {Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AddMembersScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let addMemberUser: any;

    beforeAll(async () => {
        const {user, team, channel} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        testChannel = channel;
        const {user: teamUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'addmember'});
        if (!teamUser?.id) {
            throw new Error('[beforeAll] Failed to create team user');
        }
        await Team.apiAddUserToTeam(siteOneUrl, teamUser.id, testTeam.id);
        addMemberUser = teamUser;
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Reset to channel list between tests. Prior tests can leave modals (Add Members,
        // Channel Info) or a pushed channel screen open, which makes sidebar/header taps fail.
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip both: failed Android on CI 30437339535 AND 30447839548 — the second run already
    // carried the waitForElementToExist fix, so existence-vs-visibility is not the cause.
    // Also failed iOS on 30437339535. Needs real root-cause work, not another wait tweak.

    // iOS-only skip carried over from the RF→Detox migration with no recorded failure;
    // Android still covers this case. Re-enable once the iOS path is re-verified.

    it('MM-T3195 - RN apps Add members to channel', async () => {
        // # Use pre-created user
        const newUser = addMemberUser;

        // # Open default test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.toBeVisible();

        // # Search and add user
        await AddMembersScreen.searchAndAddUser(newUser.username, newUser.id);

        // With expo-router, tapping "Add Members" pops AddMembersScreen one level back to
        // Channel Info (its navigation parent). RNN used to pop all the way to Channel.
        // Close Channel Info explicitly before verifying the system message, following the
        // same pattern used in MM-T3196 / MM-T3205 after ManageChannelMembersScreen.
        await ChannelInfoScreen.close();

        // * Verify user added system message appears
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();

    });
});
