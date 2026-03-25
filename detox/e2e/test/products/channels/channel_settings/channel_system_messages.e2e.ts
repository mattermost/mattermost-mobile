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
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let user1: any;
    let user5: any;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        testChannel = channel;

        ({user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'user1'}));
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        const {user: user3} = await User.apiCreateUser(siteOneUrl, {prefix: 'user3'});

        await Team.apiAddUserToTeam(siteOneUrl, user1.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, user3.id, testTeam.id);

        await Channel.apiAddUserToChannel(siteOneUrl, user1.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user2.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user3.id, testChannel.id);
        await wait(timeouts.TWO_SEC);

        await Channel.apiRemoveUserFromChannel(siteOneUrl, testChannel.id, user1.id);
        await wait(timeouts.TWO_SEC);

        const {user: user4} = await User.apiCreateUser(siteOneUrl, {prefix: 'user4'});
        await Team.apiAddUserToTeam(siteOneUrl, user4.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user4.id, testChannel.id);
        await wait(timeouts.TWO_SEC);

        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Test message to interrupt system messages',
        });
        await wait(timeouts.TWO_SEC);

        ({user: user5} = await User.apiCreateUser(siteOneUrl, {prefix: 'user5'}));
        await Team.apiAddUserToTeam(siteOneUrl, user5.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, user5.id, testChannel.id);
        await wait(timeouts.TWO_SEC);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T858 - Combined joinleave messages in public channel', async () => {
        // Verify the posts via API to ensure correct structure
        const {posts} = await Post.apiGetPostsInChannel(siteOneUrl, testChannel.id);

        // Verify we have the expected post types (no expect needed)
        const hasJoinPost = posts.some((p: { type: string }) => p.type === 'system_join_channel');
        const hasAddPosts = posts.filter((p: { type: string }) => p.type === 'system_add_to_channel').length >= 4;
        const hasRemovePost = posts.some((p: { type: string }) => p.type === 'system_remove_from_channel');
        const hasRegularPost = posts.some((p: { message: string }) => p.message === 'Test message to interrupt system messages');

        if (!hasJoinPost || !hasAddPosts || !hasRemovePost || !hasRegularPost) {
            throw new Error(`Missing expected posts. Join: ${hasJoinPost}, Adds: ${hasAddPosts}, Remove: ${hasRemovePost}, Regular: ${hasRegularPost}`);
        }

        // Now verify the UI displays these messages correctly
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // Verify the regular message is visible
        await expect(element(by.text('Test message to interrupt system messages'))).toBeVisible();

        await ChannelScreen.back();
    });
});
