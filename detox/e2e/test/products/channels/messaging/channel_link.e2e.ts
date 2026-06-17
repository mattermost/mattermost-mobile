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
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Channel Link', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let replyThreadChannelLink: string;
    let replyThreadTargetDisplayName: string;
    let replyThreadPostId: string;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // # Set up MM-T4877_2: pre-create the target channel and a plain-text parent post.
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        replyThreadChannelLink = `${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name}`;
        replyThreadTargetDisplayName = targetChannel.display_name;

        const {post: parentPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Reply thread parent message',
        });
        replyThreadPostId = parentPost.id;
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4877_1 - should be able to open joined channel by tapping on channel link from main channel', async () => {
        // # Open a channel screen and post a channel link to target channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const channelLink = `${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name}`;
        await ChannelScreen.postMessage(channelLink);

        // # Tap on channel link
        await element(by.text(channelLink)).tap();
        await wait(timeouts.FOUR_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(targetChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Android: KeyboardAnimationController crash via react-native-keyboard-controller
    // ("Animation in progress. Can not start a new request to
    // controlWindowInsetsAnimation()") when the thread reply input gains
    // focus during the channel-link tap flow. iOS passes reliably. Track
    // separately as an Android-only app/library fix.
    it('MM-T4877_2 - should be able to open joined channel by tapping on channel link from reply thread', async () => {
        // # Open testChannel and open the reply thread for the pre-posted plain-text parent.
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.openReplyThreadFor(replyThreadPostId, 'Reply thread parent message');

        // # Post the channel link as a reply inside the thread
        await ThreadScreen.postMessage(replyThreadChannelLink);
        await wait(timeouts.TWO_SEC);

        if (isAndroid()) {
            try {
                await ThreadScreen.postList.getFlatList().swipe('up', 'fast', 0.3);
            } catch {
                // Post list may be too short to scroll
            }
            await wait(timeouts.TWO_SEC);
        }

        // # Tap on channel link from within the reply thread
        await element(by.text(replyThreadChannelLink)).atIndex(0).tap();
        await wait(timeouts.FOUR_SEC);

        // * Verify redirected to target channel
        await expect(ChannelScreen.headerTitle).toHaveText(replyThreadTargetDisplayName);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
