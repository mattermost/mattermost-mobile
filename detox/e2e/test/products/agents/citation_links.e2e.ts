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
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

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

        // # Create a post to link to
        const targetPostMessage = `Target Post ${getRandomId()}`;
        const targetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: targetPostMessage,
        });

        // # Create a post with citation link to the target post
        // Format: [text](http://server/team/pl/postId?view=citation)
        // We can use a relative URL or constructing full one. The implementation parses the path.
        // Let's try relative path assuming current server context or full path.
        // The implementation uses URL() constructor in InlineEntityLink if provided, but transform.ts handles string matching.
        // Let's use a mock full URL structure.
        const postId = targetPost.post.id;
        const citationUrl = `${serverOneUrl}/${testTeam.name}/pl/${postId}?view=citation`;
        const citationMessage = `Here is a citation: [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Verify message is posted
        await expect(element(by.text(citationMessage))).not.toBeVisible(); // Markdown should render differently

        // * Verify citation icon is rendered
        // testID format: inline_entity_link.post.postId
        await expect(element(by.id(`inline_entity_link.post.${postId}`))).toBeVisible();

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
        const citationMessage = `Channel citation: [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Verify citation icon is rendered
        // testID format: inline_entity_link.channel.channelName
        // Note: channel name in testID comes from the URL
        await expect(element(by.id(`inline_entity_link.channel.${channelName}`))).toBeVisible();

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
        const citationMessage = `Team citation: [Source](${citationUrl})`;

        await ChannelScreen.postMessage(citationMessage);

        // * Verify citation icon is rendered
        // testID format: inline_entity_link.team.teamName
        await expect(element(by.id(`inline_entity_link.team.${teamName}`))).toBeVisible();

        // # Back to channel list
        await ChannelScreen.back();
    });
});

