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
import {getRandomId, timeouts, wait} from '@support/utils';
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

    it('MM-T216_1 - should scroll to bottom when sending a message after scrolling up', async () => {
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
        await ChannelScreen.postMessage(newMessage);

        // * Verify the new message is visible (view scrolled to bottom)
        const {post: lastPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(lastPost.id, newMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
