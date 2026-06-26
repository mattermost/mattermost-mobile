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
import {isAndroid, tapNativeBackButton, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Code Block Dismisses Keyboard', () => {
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

    it('MM-T1433_1 - should dismiss keyboard when tapping a code block', async () => {
        // # Post a message containing a code block
        const codeBlockMessage = '```\nconst x = 1;\n```';
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: codeBlockMessage});
        const {post: codePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open channel and tap post input to open the keyboard
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // # Tap the code block — navigates to Code preview screen and dismisses the keyboard
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(codePost.id, '');
        await postListPostItemCodeBlock.tap();
        await wait(timeouts.ONE_SEC);

        // # Go back from Code preview screen to channel screen
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await tapNativeBackButton();
        }
        await ChannelScreen.toBeVisible();

        // * Verify the keyboard is dismissed — send button is disabled (no text in draft)
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
