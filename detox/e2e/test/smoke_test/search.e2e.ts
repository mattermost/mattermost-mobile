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
    PostOptionsScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Search', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T4911_1 - should be able to display a recent mention on recent mentions screen', async () => {
        // # Open a channel screen, post a message with at-mention to current user, go back to channel list screen, and open recent mentions screen
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen and recent mention is displayed
        await RecentMentionsScreen.toBeVisible();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = RecentMentionsScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4911_2 - should be able to display a saved message on saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen and saved message is displayed
        await SavedMessagesScreen.toBeVisible();
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });
});
