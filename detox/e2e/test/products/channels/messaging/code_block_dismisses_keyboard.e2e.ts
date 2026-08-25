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
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

const MAX_CODE_BLOCK_VISIBILITY_SCROLLS = 6;

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
        // # Open channel and post a code block via the app UI.
        // Post.apiCreatePost can hang for the full Jest budget with no
        // response / no [client] log (silent TCP stall). UI send uses the app network stack
        // and keeps this suite moving when the Detox API client would otherwise wedge.
        const codeBlockMessage = '```\nconst x = 1;\n```';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(codeBlockMessage);
        const {post: codePost} = await Post.apiFindPostInChannelByMessage(
            siteOneUrl,
            testChannel.id,
            codeBlockMessage,
        );
        if (!codePost?.id) {
            throw new Error('MM-T1433_1: could not resolve code-block post after UI send');
        }

        // # Tap post input to open the keyboard
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // # Reveal the code block above the keyboard (same pattern as markdown_code.e2e.ts)
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(codePost.id, '');
        await waitFor(postListPostItemCodeBlock).toExist().withTimeout(timeouts.TEN_SEC);

        // The post list is inverted. Drive it only until the short block clears the composer;
        // a fixed upward scroll moves the newest post farther below the visible viewport.
        /* eslint-disable no-await-in-loop -- bounded visibility scan */
        for (let attempt = 0; attempt < MAX_CODE_BLOCK_VISIBILITY_SCROLLS; attempt++) {
            try {
                await expect(postListPostItemCodeBlock).toBeVisible(40);
                break;
            } catch {
                try {
                    await ChannelScreen.getFlatPostList().scroll(50, 'down', 0.5, 0.5);
                } catch {
                    // The final assertion reports if the list edge still clips the block.
                }
            }
        }
        /* eslint-enable no-await-in-loop */
        await expect(postListPostItemCodeBlock).toBeVisible(40);
        await expect(ChannelScreen.postInput).toBeFocused();

        // # Tap the code block — navigates to Code preview screen and dismisses the keyboard.
        // The block is only ~35pt tall; a center tap fails iOS 100% visibility (MM-T1433_1).
        //
        // toBeVisible(40) above only guarantees that *some* 40% of the block is on screen,
        // and the composer plus the keyboard clip it from the top — so the {10, 8} point can
        // still land under them and the tap goes nowhere. That is what happened on ios22
        // (f181296): the tap was accepted, Code preview never opened, and testFnFailure.png
        // shows the block still tucked behind the composer 10s later. Expose more of the
        // block and re-tap instead of giving up on a target that was never reachable.
        /* eslint-disable no-await-in-loop -- scroll further between tap attempts */
        let codePreviewOpened = false;
        for (let attempt = 0; attempt < 4 && !codePreviewOpened; attempt++) {
            try {
                await postListPostItemCodeBlock.tap({x: 10, y: 8});
                await waitFor(CodeScreen.title).toBeVisible().withTimeout(timeouts.FIVE_SEC);
                codePreviewOpened = true;
            } catch {
                try {
                    await ChannelScreen.getFlatPostList().scroll(60, 'down', 0.5, 0.5);
                } catch {
                    // The list is already at its edge; the throw below reports it.
                }
            }
        }
        /* eslint-enable no-await-in-loop */

        if (!codePreviewOpened) {
            throw new Error('MM-T1433_1: tapping the code block never opened the Code preview — it stayed clipped by the composer');
        }

        // * Verify Code preview opened
        await CodeScreen.toBeVisible();

        // # Go back from Code preview. Android hardware back is the proven path.
        // iOS uses the scoped code.screen.back so the tap does not land on the
        // still-mounted channel header.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await CodeScreen.back();
        }
        await ChannelScreen.toBeVisible();

        // * Verify the keyboard is dismissed — send button is disabled (no text in draft)
        //   and the composer lost focus after returning from the code preview.
        await waitFor(ChannelScreen.sendButtonDisabled).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.postInput).not.toBeFocused().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
