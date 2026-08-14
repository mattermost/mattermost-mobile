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
    CodeScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

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

    // iOS stays skipped until MM-70011 (code.screen.back) is proven 3×.
    // Android already leaves via hardware back.
    (isIos() ? it.skip : it)('MM-T1433_1 - should dismiss keyboard when tapping a code block', async () => {
        // # Open channel and post a code block via the app UI.
        // Post.apiCreatePost can hang for the full Jest budget with no
        // response / no [client] log (silent TCP stall). UI send uses the app network stack
        // and keeps this suite moving when the Detox API client would otherwise wedge.
        const codeBlockMessage = '```\nconst x = 1;\n```';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(codeBlockMessage);
        const {post: codePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!codePost?.id) {
            throw new Error('MM-T1433_1: could not resolve code-block post after UI send');
        }

        // # Tap post input to open the keyboard
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // # Reveal the code block above the keyboard (same pattern as markdown_code.e2e.ts)
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(codePost.id, '');
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(timeouts.TEN_SEC);

        // Scroll up fails when the post list is already at the top (Detox scroll boundary).
        try {
            await ChannelScreen.getFlatPostList().scroll(300, 'up', 0.5, 0.5);
        } catch { /* already at top — non-fatal */ }

        // # Tap the code block — navigates to Code preview screen and dismisses the keyboard
        await postListPostItemCodeBlock.tap();

        // * Verify Code preview opened
        await CodeScreen.toBeVisible();

        // # Go back from Code preview. Android hardware back is the proven path.
        // iOS uses the scoped code.screen.back (MM-70011) so the tap does not
        // land on the still-mounted channel header.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await CodeScreen.back();
        }
        await ChannelScreen.toBeVisible();

        // * Verify the keyboard is dismissed — send button is disabled (no text in draft)
        //   and the composer lost focus after returning from the code preview.
        await waitFor(ChannelScreen.sendButtonDisabled).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();
        await waitFor(ChannelScreen.postInput).not.toBeFocused().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
