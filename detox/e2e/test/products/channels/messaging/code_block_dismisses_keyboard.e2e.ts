// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {NavigationHeader} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    CodeScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, scrollElementIntoView, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {waitFor} from 'detox';

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
        const {post: codePost} = await ChannelScreen.postMessageAndVerify(codeBlockMessage, testChannel.id, siteOneUrl);
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

        // A short block next to an open keyboard keeps failing the 75% iOS default
        // threshold (run 33237899744 — "does not pass visibility percent threshold
        // (75)"): the keyboard eats the lower half of the viewport, so a block sitting
        // just above it may be fully painted yet well under 75% of its own height
        // visible. Scroll the row into the visible slice first (same discipline
        // openPostOptionsFor uses), then require only a tap-sufficient 25%.
        // Existence is not presentation. In run 33036930610 the toExist() wait above passed
        // while the post was not painted at all: the DETOX_VISIBILITY_*_SCREEN.png captured
        // at check time shows only the channel intro and the System join message — no code
        // block, and no keyboard (device.log has zero UIKeyboardWillShow). Detox still
        // resolved the element (bounds 328 x 34.67) and then failed tap()'s 100% gate with
        // "View is not visible around point". Wait for it to actually render before tapping.

        try {
            await scrollElementIntoView(postListPostItemCodeBlock, by.id('channel.post_list.flat_list'));
        } catch { /* fell back to plain scroll above; the wait below still gates the tap */ }

        await waitForElementToBeVisible(postListPostItemCodeBlock, timeouts.TEN_SEC, timeouts.HALF_SEC, 25);

        // # Tap the code block — navigates to Code preview screen and dismisses the keyboard
        await postListPostItemCodeBlock.tap();

        // * Verify Code preview opened
        await CodeScreen.toBeVisible();

        // # Go back from Code preview screen to channel screen.
        // Code route uses custom NavigationHeader (headerBackTitle ''), so by.label('Back')
        // never matches — tapNativeBackButton timed out on this screen.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await waitFor(NavigationHeader.backButton).toExist().withTimeout(timeouts.TEN_SEC);
            await NavigationHeader.backButton.tap();
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
