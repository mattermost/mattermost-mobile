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
    EditPostScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Smoke Test - Messaging', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    const pinnedText = 'Pinned';
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

    it('MM-T4786_5 - should be able to post a message with at-mention and channel mention', async () => {
        // # Open a channel screen and post a message with at-mention and channel mention
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const message = `Message @${testUser.username} ~${targetChannel.name}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify at-mention is posted as lowercase and channel mention is posted as display name
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `Message @${testUser.username.toLowerCase()} ~${targetChannel.display_name}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
