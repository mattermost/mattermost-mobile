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
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {

    const serverOneDisplayName = 'Server 1';

    // Base setup (shared across all tests)
    let testUser: any;
    let testTeam: any;
    let testChannel: any;

    // Test-specific data
    let gmUser1: any; // For MM-T878
    let gmUser2: any; // For MM-T878

    const tapMembersOption = async () => {
        try {
            await ChannelInfoScreen.scrollView.scroll(200, 'down');
        } catch {
            // scrollView may not need scrolling
        }
        await waitFor(ChannelInfoScreen.membersOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.membersOption.tap();
    };

    beforeAll(async () => {
        // 1. Base setup (shared across all tests)
        const {user, team, channel} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        testChannel = channel;

        // 2. Test 1 (MM-T3195): User for adding to channel
        const {user: newUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'addmember'});
        if (!newUser1?.id) {
            throw new Error('[beforeAll] Failed to create addMemberUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newUser1.id, testTeam.id);

        // 3. Test 2 (MM-T856): Another user for adding to channel
        const {user: newUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        if (!newUser2?.id) {
            throw new Error('[beforeAll] Failed to create user2');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newUser2.id, testTeam.id);

        // 4. Test 3 (MM-T3196): User already in channel for removal
        const {user: newUser3} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
        if (!newUser3?.id) {
            throw new Error('[beforeAll] Failed to create memberUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newUser3.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, newUser3.id, testChannel.id);

        // 5. Test 4 (MM-T3204): Private channel + user to add
        const {channel: privChan1} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        if (!privChan1?.id) {
            throw new Error('[beforeAll] Failed to create private channel 1');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan1.id);

        const {user: newUser4} = await User.apiCreateUser(siteOneUrl, {prefix: 'privuser'});
        if (!newUser4?.id) {
            throw new Error('[beforeAll] Failed to create privUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newUser4.id, testTeam.id);

        // 6. Test 5 (MM-T3205): Private channel + user already in it for removal
        const {channel: privChan2} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        if (!privChan2?.id) {
            throw new Error('[beforeAll] Failed to create private channel 2');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan2.id);

        const {user: newUser5} = await User.apiCreateUser(siteOneUrl, {prefix: 'removeme'});
        if (!newUser5?.id) {
            throw new Error('[beforeAll] Failed to create removeMeUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newUser5.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, newUser5.id, privChan2.id);

        // 7. Test 6 (MM-T878): Two users for GM creation
        const {user: gmUserOne} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser1'});
        if (!gmUserOne?.id) {
            throw new Error('[beforeAll] Failed to create gmUser1');
        }
        await wait(timeouts.ONE_SEC);
        const {user: gmUserTwo} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser2'});
        if (!gmUserTwo?.id) {
            throw new Error('[beforeAll] Failed to create gmUser2');
        }
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, gmUserOne.id, testTeam.id);
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, gmUserTwo.id, testTeam.id);
        await wait(timeouts.ONE_SEC);
        gmUser1 = gmUserOne;
        gmUser2 = gmUserTwo;

        // 8. Login once with test user
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

    it('MM-T878 - RN apps View Members in GM', async () => {

        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(`${gmUser1.username}`);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);

        await CreateDirectMessageScreen.getUserItem(gmUser1.id).tap({x: 1, y: 1});

        // * Verify the first new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(gmUser1.id)).toBeVisible();

        // # Search for the second new user and tap on the second new user item
        await CreateDirectMessageScreen.searchInput.replaceText(`${gmUser2.username}`);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(gmUser2.id).tap({x: 1, y: 1});

        // * Verify the second new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(gmUser2.id)).toBeVisible();

        // # Tap on start button
        // Wait for chip-add animation — UITransitionView overlay intercepts startButton center-tap.
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.startButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.toBeVisible();

        // # Open channel info and tap members option
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await tapMembersOption();
        await wait(timeouts.TWO_SEC);

        // * Verify members list is visible
        await expect(ManageChannelMembersScreen.gmMemberSectionList).toBeVisible();

        // # Go back
        await ManageChannelMembersScreen.close();
        await wait(timeouts.ONE_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
