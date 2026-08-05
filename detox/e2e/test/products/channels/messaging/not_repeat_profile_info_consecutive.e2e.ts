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

describe('Messaging - Post Display Behavior', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T77_1 - should not repeat profile info for consecutive messages from same user', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Post first message
        const firstMessage = `First message ${getRandomId()}`;
        await ChannelScreen.postMessage(firstMessage);
        const {post: firstPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post second consecutive message as the same user
        const secondMessage = `Second message ${getRandomId()}`;
        await ChannelScreen.postMessage(secondMessage);
        const {post: secondPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify first post has a display name header
        const {postListPostItemHeaderDisplayName: firstPostHeader} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await expect(firstPostHeader).toExist();

        // * Verify second consecutive post does NOT show the display name again
        const {postListPostItemHeaderDisplayName: secondPostHeader} = ChannelScreen.getPostListPostItem(secondPost.id, secondMessage);
        await expect(secondPostHeader).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
