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
import {Alert} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Character Limit', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const maxPostSize = 16383;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip iOS: CI run 30000635898 — the suite starts without the Home tab after its oversized draft.
    (isIos() ? it.skip : it)('MM-T107 - should show warning and disable send when message exceeds character limit', async () => {
        // # Open a channel and type a message exceeding the 16383 character limit
        const overLimitMessage = '1234567890'.repeat(1638) + '1234';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText(overLimitMessage);

        // * Verify character limit warning is displayed
        await expect(Alert.messageLengthTitle).toBeVisible();
        await expect(element(by.text(`Your current message is too long. Current character count: ${overLimitMessage.trim().length}/${maxPostSize}`)).atIndex(0)).toBeVisible();

        // # Dismiss the alert
        await Alert.dismissMessageLengthAlert();

        // * Verify send button is disabled
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // * Verify the over-limit message was not posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, overLimitMessage);
        await expect(postListPostItem).not.toExist();

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });
});
