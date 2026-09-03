// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Post, Setup, Status, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

describe('Account - Set User Status (Other User)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let testOtherUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Create a second user in the same channel so they can observe the first user's status
        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, testChannel.id);

        // # Set the first user's status to Away (admin session)
        await Status.apiUpdateUserStatus(siteOneUrl, testUser.id, 'away');

        // # Log in as the first user via API so the post is authored by them
        await User.apiLogin(siteOneUrl, {
            username: testUser.newUser.username,
            password: testUser.newUser.password,
        });

        // # Post a message as the first user so the other user has a post to observe the status on
        const message = `status check ${Date.now()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});

        // # Log in as the second user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testOtherUser);
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3251 - should show the first user status to another user', async () => {
        // # Open the shared channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the first user's Away status indicator is rendered. The status
        // indicator is a small font icon whose ancestor's visibility check is
        // unreliable, so assert on the indicator directly (only one is rendered).
        const awayStatusIcon = element(by.id('user_status.indicator.away'));
        await waitFor(awayStatusIcon).toExist().withTimeout(timeouts.HALF_MIN);
        await expect(awayStatusIcon).toExist();
    });
});
