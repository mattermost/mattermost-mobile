// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
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
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';

describe('Agents - Citation Links', () => {
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

    it('should render citation icon for POST entity', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Create a target post to link to via API
        const targetPostMessage = `Target Post ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: targetPostMessage,
        });
        const postId = targetPost.post.id;

        // # Wait for target post to appear
        await wait(timeouts.ONE_SEC);

        // # Create a post with citation link to the target post
        // Format: [text](http://server/team/pl/postId?view=citation)
        const citationUrl = `${serverOneUrl}/${testTeam.name}/pl/${postId}?view=citation`;
        const citationMessage = `Here is a citation [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Wait for the post to render and verify citation icon is displayed
        // testID format: inline_entity_link.post.{postId}
        await waitFor(element(by.id(`inline_entity_link.post.${postId}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Back to channel list
        await ChannelScreen.back();
    });

    it('should render citation icon for CHANNEL entity', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Create a post with citation link to the current channel
        // Format: [text](http://server/team/channels/channelName?view=citation)
        const channelName = testChannel.name;
        const citationUrl = `${serverOneUrl}/${testTeam.name}/channels/${channelName}?view=citation`;
        const citationMessage = `Channel citation [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Wait for the post to render and verify citation icon is displayed
        // testID format: inline_entity_link.channel.{channelName}
        await waitFor(element(by.id(`inline_entity_link.channel.${channelName}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Back to channel list
        await ChannelScreen.back();
    });

    it('should render citation icon for TEAM entity', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Create a post with citation link to the current team
        // Format: [text](http://server/team?view=citation)
        const teamName = testTeam.name;
        const citationUrl = `${serverOneUrl}/${teamName}?view=citation`;
        const citationMessage = `Team citation [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Wait for the post to render and verify citation icon is displayed
        // testID format: inline_entity_link.team.{teamName}
        await waitFor(element(by.id(`inline_entity_link.team.${teamName}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Back to channel list
        await ChannelScreen.back();
    });
});
