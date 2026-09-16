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
    System,
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
import {isAndroid} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Character Limit', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let maxPostSize: number;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // The server computes this; it rose from 16383 to 262144 on server main.
        maxPostSize = await System.apiGetMaxPostSize(siteOneUrl);

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

    // 262145 runes in the input ANRs Android (LineBreaker.nComputeLineBreaks on the main thread),
    // so the over-limit assertions run on iOS only until the app bounds text measurement.
    const itNotAndroid = isAndroid() ? it.skip : it;

    itNotAndroid('MM-T107 - should show warning and disable send when message exceeds character limit', async () => {
        // # Open a channel and type a message one rune over the server's limit
        const overLimitMessage = 'a'.repeat(maxPostSize + 1);
        const {post: lastPostBefore} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
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

        // * Verify the over-limit message was not posted (last channel post unchanged)
        const {post: lastPostAfter} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (lastPostAfter.id !== lastPostBefore.id) {
            throw new Error(
                `Over-limit message appears posted: last post changed from ${lastPostBefore.id} to ${lastPostAfter.id}`,
            );
        }

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });
});
