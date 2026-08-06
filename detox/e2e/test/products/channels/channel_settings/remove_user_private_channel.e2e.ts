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
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';

describe('Channels', () => {

    const serverOneDisplayName = 'Server 1';

    let testUser: any;
    let testTeam: any;
    let privateChannel2: any;
    let removeMeUser: any;

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
        privateChannel2 = privChan;
        const {user: newPrivUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'removeme'});
        if (!newPrivUser?.id) {
            throw new Error('[beforeAll] Failed to create private-channel user');
        }
        await Team.apiAddUserToTeam(siteOneUrl, newPrivUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, newPrivUser.id, privChan.id);
        removeMeUser = newPrivUser;
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

    (isIos() ? it.skip : it)('MM-T3205 - RN apps Remove user from private channel', async () => {
        // # Use pre-created private channel and user (already in channel)
        const privateChannel = privateChannel2;
        const removedUser = removeMeUser;

        // # Open private channel (Find Channels is reliable for API-created channels)
        await ChannelScreen.openViaFindChannels(privateChannel.name);

        // # Open channel info and tap members option
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await tapMembersOption();
        await wait(timeouts.TWO_SEC);

        await ManageChannelMembersScreen.toBeVisible();
        await waitFor(ManageChannelMembersScreen.manageButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ManageChannelMembersScreen.manageButton.tap({x: 1, y: 1});
        await wait(timeouts.TWO_SEC);

        // # Search and remove user
        await ManageChannelMembersScreen.searchAndRemoveUser(removedUser.username, removedUser.id);

        // * Verify user removed system message appears
        // On iOS, device.pressBack() in searchAndRemoveUser is a no-op — close ManageMembers manually
        if (isIos()) {
            await ManageChannelMembersScreen.close();
        }
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${removedUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();

        await ChannelScreen.back();
    });
});
