// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emoji Display', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T151_1 - should show limited post options when long pressing a system message', async () => {
        // # Seed a regular post so the upcoming system join message is not combined
        // with older user-activity posts (keeps testID as user-activity-{postId}).
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'seed post so system message stays uncombined',
        });

        // # Create a second user to generate a system message when added to the channel
        const {user: secondUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, secondUser.id, testTeam.id);

        // # Add second user to channel to generate a system message (e.g. "@user joined the channel")
        await Channel.apiAddUserToChannel(siteOneUrl, secondUser.id, testChannel.id);

        // # Open the channel — the system post is the newest message so it renders in the visible area
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // # Get the last post — the system add-to-channel message. The seed post above keeps it
        // from being combined with older user-activity posts.
        const {post: systemPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the system message is visible. System add-to-channel posts render via
        // CombinedUserActivity with testID 'channel.post_list.combined_user_activity.user-activity-{postId}'.
        const systemPostItem = element(by.id(`channel.post_list.combined_user_activity.user-activity-${systemPost.id}`));
        await waitFor(systemPostItem).toBeVisible().withTimeout(timeouts.HALF_MIN);

        // # Long press the system message. CombinedUserActivity.onLongPress() returns early when
        // canDelete is false, so the post options modal should not open.
        await systemPostItem.longPress(timeouts.TWO_SEC);
        await wait(timeouts.TWO_SEC);

        // * Verify the post options screen does NOT appear for a non-deletable system message
        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
