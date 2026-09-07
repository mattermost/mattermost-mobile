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
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        const {post: firstPost} = await ChannelScreen.postMessageAndVerify(firstMessage, testChannel.id, siteOneUrl);

        // # Post second consecutive message as the same user
        const secondMessage = `Second message ${getRandomId()}`;
        const {post: secondPost} = await ChannelScreen.postMessageAndVerify(secondMessage, testChannel.id, siteOneUrl);

        // * Verify first post has a display name header
        const {postListPostItemHeaderDisplayName: firstPostHeader} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await expect(firstPostHeader).toExist();

        // * Verify second consecutive post does NOT show the display name again
        const {postListPostItemHeaderDisplayName: secondPostHeader} = ChannelScreen.getPostListPostItem(secondPost.id, secondMessage);
        await expect(secondPostHeader).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Skipped on Android — SEC-11084 (under SEC-10781, Mobile E2E stabilization).
    // iOS is green on this code and stays enabled.
    //
    // The test proves "the list left the bottom" by asserting the NEWEST post is no
    // longer visible. On the Android emulator that post is 91px tall, so Espresso needs
    // under ~45px of it showing before not.toBeVisible() holds — and the list reaches its
    // content edge (20 filler posts) before that ever happens. whileElement().scroll()
    // gives up when it can no longer scroll and rethrows, so the loop always throws:
    //   'not (... covers at least <50> percent of the view's area)' doesn't match
    //   Got: ReactViewGroup{... 0,0-1440,91} tag=channel.post_list.post.<id>
    // Deterministic, not flaky: Android passed 7/7 on the previous single-drag version
    // and has failed 2/2 since (PR #9972 7e2dc91, PR #9930 5f8707c9), identically.
    //
    // Do NOT re-tune the scroll distance — three budgets have been tried (5000px single
    // drag, 2x500px, adaptive 300px) and each only moved the failure between platforms.
    // Fix by proving movement positively instead, e.g. asserting an OLDER post became
    // visible, which depends on neither viewport height nor a percentage-of-area
    // threshold on a short row.
    (isAndroid() ? it.skip : it)('MM-T216_1 - should scroll to bottom when sending a message after scrolling up', async () => {
        // # Create many posts via API to fill the channel history and enable scrolling
        for (let i = 0; i < 20; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Filler post ${i} ${getRandomId()}`});
        }

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Wait for the FlatList to fully render before scrolling — without this Detox's
        // scroll() can throw a divide-by-zero on Android.
        const lastFillerPost = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: lastFillerItem} = ChannelScreen.getPostListPostItem(lastFillerPost.post.id, lastFillerPost.post.message);
        await waitFor(lastFillerItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Scroll up from mid-screen until the newest post has actually left the viewport
        // (the bottom edge is occluded by the post-draft input on iOS, hence mid-screen).
        // A fixed pixel budget cannot hold on both platforms: 1000px moved the newest post
        // to the top of the Android emulator's viewport but left it fully on screen — the
        // post is only 91px tall in a ~2400px viewport — so the "left the bottom" assertion
        // below failed on Android while passing on iOS. Scrolling until the expectation is
        // met removes the viewport-height dependency. Small increments also keep each
        // synthetic drag too short to dwell on a post and fire its long-press handler, which
        // one long drag does: that opens the post-options sheet over the draft input and
        // makes the send below fail an opaque 100% visibility check.
        await waitFor(lastFillerItem).not.toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(300, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        // # Close the post-options sheet if a scroll gesture still tripped a long press —
        // Detox gesture timing under CI load is outside this test's control, and the sheet
        // would otherwise occlude the draft input and fail the send with an opaque
        // "view is not visible" error. Probe-and-recover, matching dismissKnownModals().
        // Runs before the assertion below so an open sheet cannot make it pass by occlusion.
        let postOptionsOpen = true;
        try {
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.HALF_SEC);
        } catch {
            // Expected path: no sheet was opened by the scroll.
            postOptionsOpen = false;
        }
        if (postOptionsOpen) {
            // Outside the catch: a failure to close is a real problem, not an absent sheet.
            await PostOptionsScreen.close();
        }

        // * Re-verify the list is away from the bottom now that no sheet is open, so the
        // scroll-to-bottom check below cannot pass vacuously — either because the gesture
        // did nothing, or because a post-options sheet, not the scroll, hid the post.
        await expect(lastFillerItem).not.toBeVisible();

        // # Send a new message from the UI
        const newMessage = `New bottom message ${getRandomId()}`;

        // * Verify the new message is visible (view scrolled to bottom)
        const {post: lastPost} = await ChannelScreen.postMessageAndVerify(newMessage, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(lastPost.id, newMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3147_1 - should scroll to bottom when a message is received while keyboard is open', async () => {
        // # Create filler posts and the target message via API before opening the channel
        for (let i = 0; i < 15; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Keyboard scroll filler ${i} ${getRandomId()}`});
        }
        const incomingMessage = `Incoming message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: incomingMessage});
        const {post: incomingPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open channel screen and tap post input to open the keyboard
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify the latest post is visible at the bottom even with the keyboard open
        const {postListPostItem} = ChannelScreen.getPostListPostItem(incomingPost.id, incomingMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
