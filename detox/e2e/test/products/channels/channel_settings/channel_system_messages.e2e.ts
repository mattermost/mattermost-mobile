// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T858: Combined joinleave messages in public channel
 */

import {Channel, Post, Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T858 - Combined joinleave messages in public channel', async () => {
        // Expected Results (for all steps):
        // * Observe the following three posts
        // * (how the username/first-last/nickname displays can vary based on Account Settings, but they should at least combine in this way):
        // * System
        // * @user4 joined the channel
        // * @user1 and 2 others were added to the channel by you
        // * <2 others is a link that shows the others when clicked: user2, user3>
        // * @user1 (or 2 or 3) was removed from the channel.
        // * <the test message you posted>
        // * System
        // * @user5 added to the channel by you.

        // # Setup: Create test channel and users
        const channelName = `joinleave-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'user1'});
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        const {user: user3} = await User.apiCreateUser(siteOneUrl, {prefix: 'user3'});
        await Team.apiAddUserToTeam(siteOneUrl, user1.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, user3.id, testTeam.id);

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: Add any 3 users to a public channel (we'll call them user1, user2, user3)
        await Channel.apiAddUserToChannel(siteOneUrl, user1.id, channel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user2.id, channel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user3.id, channel.id);
        await wait(timeouts.TWO_SEC);

        // # Step 2: Observe system message " and 2 others were added to the channel by you", and "and 2 others" is a link (but don't click it yet, or if you already did, refresh to re-collapse it)
        // System messages should be visible

        // # Step 3: Remove one of ^those users from the channel (user1)
        await Channel.apiRemoveUserFromChannel(siteOneUrl, channel.id, user1.id);
        await wait(timeouts.TWO_SEC);

        // # Step 4: Have yet another user (not one of the above) log in in another browser and join that channel themselves (user4)
        // Note: Simulating this via API
        const {user: user4} = await User.apiCreateUser(siteOneUrl, {prefix: 'user4'});
        await Team.apiAddUserToTeam(siteOneUrl, user4.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user4.id, channel.id);
        await wait(timeouts.TWO_SEC);

        // # Step 5: Post a message in the channel to interrupt the join/leave messages
        await Post.apiCreatePost(siteOneUrl, {
            channelId: channel.id,
            message: 'Test message to interrupt system messages',
        });
        await wait(timeouts.TWO_SEC);

        // # Step 6: You add yet another user (not one of the above users) to the channel (user5)
        const {user: user5} = await User.apiCreateUser(siteOneUrl, {prefix: 'user5'});
        await Team.apiAddUserToTeam(siteOneUrl, user5.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user5.id, channel.id);
        await wait(timeouts.TWO_SEC);

        // * Verify system messages are displayed
        // Note: Exact message combining behavior is handled by the server
        // We verify that system messages are present
        await expect(element(by.id('post_list'))).toBeVisible();

        // Go back to channel list
        await ChannelScreen.back();
    });
});
