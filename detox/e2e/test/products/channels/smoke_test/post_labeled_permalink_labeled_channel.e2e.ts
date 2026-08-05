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
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';

describe('Smoke Test - Messaging', () => {

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

    // Skip both: CI run 30000635898 — iOS post-option actions are unhittable and Android cascades at channel setup.

    it('MM-T4786_6 - should be able to post labeled permalink and labeled channel link', async () => {
        // # Post a target message in a target channel
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        // # Open a channel screen and post a message with labeled permalink to the target message and labeled channel link to the target channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const permalinkLabel = `permalink-${getRandomId()}`;
        const permalinkMessage = `[${permalinkLabel}](/${testTeam.name}/pl/${permalinkTargetPost.id})`;
        const channelLinkLabel = `channel-link-${getRandomId()}`;
        const channelLinkMessage = `[${channelLinkLabel}](${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name})`;
        const message = `Message ${permalinkMessage} ${channelLinkMessage}`;
        await ChannelScreen.postMessage(message);

        // * Verify permalink and channel link are posted as labeled links
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `Message ${permalinkLabel} ${channelLinkLabel}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
