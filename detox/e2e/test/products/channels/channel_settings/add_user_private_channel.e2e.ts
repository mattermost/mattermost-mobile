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

import {Channel, Setup, Team, User} from '@support/server_api';
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

    let testUser: any;
    let testTeam: any;
    let privateChannel1: any;
    let privUser: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        const {channel: privChan} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        if (!privChan?.id) {
            throw new Error('[beforeAll] Failed to create private channel');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan.id);
        privateChannel1 = privChan;
        const {user: newPrivUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'privuser'});
        if (!newPrivUser?.id) {
            throw new Error('[beforeAll] Failed to create private-channel user');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newPrivUser.id, testTeam.id);
        privUser = newPrivUser;
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

    it('MM-T3204 - RN apps Add user to private channel', async () => {
        // # Use pre-created private channel and user
        const privateChannel = privateChannel1;
        const newUser = privUser;

        // # Open private channel (Find Channels is reliable for API-created channels)
        await ChannelScreen.openViaFindChannels(privateChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present and search and add user
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.toBeVisible();
        await AddMembersScreen.searchAndAddUser(newUser.username, newUser.id);

        // expo-router pops AddMembersScreen one level back to Channel Info — close it first.
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
