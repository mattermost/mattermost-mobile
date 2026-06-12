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
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

describe('Messaging - Channel Mention', () => {
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

        // Ensure the channel has propagated to the sidebar before any test body runs.
        await ChannelListScreen.waitForSidebarPublicChannelDisplayNameVisible(testChannel.name);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4875_1 - should post channel mention as channel display name', async () => {
        // # Open a channel screen and post a channel name mention
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelNameMention = `~${targetChannel.name}`;
        await ChannelScreen.postMessage(channelNameMention);

        // * Verify post shows channel display name mention
        const channelDisplayNameMention = `~${targetChannel.display_name}`;
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, channelDisplayNameMention);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4875_2 - should be able to open joined channel by tapping on channel mention', async () => {
        // # Open a channel screen, post a channel name mention, and tap on channel display name mention
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelNameMention = `~${targetChannel.name}`;
        const channelDisplayNameMention = `~${targetChannel.display_name}`;
        await ChannelScreen.postMessage(channelNameMention);

        // Tap the channel mention using center coordinates (no offset). The previous
        // approach used {x:5, y:10} which placed the tap 10px from the top of the
        // mention text — close enough to overlap with the line above (T4875_1's mention)
        // when both posts are grouped under the same author header in the post list.
        await element(by.text(channelDisplayNameMention)).tap();

        // * Verify redirected to target channel. Use waitFor with a long timeout
        // because deep-link navigation on Android can take longer than 1s, causing
        // an immediate expect() to read the old channel name.
        await waitFor(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name).withTimeout(timeouts.HALF_MIN);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
