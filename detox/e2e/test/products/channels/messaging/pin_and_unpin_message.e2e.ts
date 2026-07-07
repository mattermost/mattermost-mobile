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
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

async function openChannelPostOptionsForPin(postId: string, message: string) {
    if (!isAndroid()) {
        await ChannelScreen.openPostOptionsFor(postId, message);
        return;
    }

    const flatList = ChannelScreen.getFlatPostList();
    const target = element(
        by.text(message).withAncestor(by.id(`channel.post_list.post.${postId}`)),
    );

    await waitFor(target).toBeVisible().withTimeout(timeouts.TEN_SEC);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await flatList.scroll(100, 'down', 0.5, 0.5);
        } catch {
            // Ignore scroll failures at list boundaries.
        }

        // eslint-disable-next-line no-await-in-loop
        await wait(timeouts.THREE_SEC);
        // eslint-disable-next-line no-await-in-loop
        await target.longPress(timeouts.FIVE_SEC);

        try {
            // eslint-disable-next-line no-await-in-loop
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC);
            return;
        } catch {
            if (attempt === 3) {
                throw new Error(`Post options did not appear for "${message}" after ${attempt} attempts`);
            }
        }
    }
}

describe('Messaging - Pin and Unpin Message', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const pinnedText = 'Pinned';
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

    it('MM-T4865_1 - should be able to pin/unpin a message via post options on channel screen', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // Send + verify it landed (retries once on sim -1005 POST drop).
        const {post} = await ChannelScreen.postMessageAndVerify(message, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);

        // Wait for post to exist (may be off-screen); openChannelPostOptionsForPin scrolls before long-press.
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on pin to channel option
        await openChannelPostOptionsForPin(post.id, message);

        // Wait for pin row visibility — post-options sheet overlay can block center-tap on open.
        await waitFor(PostOptionsScreen.pinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.pinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await openChannelPostOptionsForPin(post.id, message);
        await waitFor(PostOptionsScreen.unpinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is not displayed on the post pre-header
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4865_2 - should be able to pin/unpin a message via post options on thread screen', async () => {
        // # Open a channel screen, post a message, tap on post to open thread, open post options for message, and tap on pin to channel option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {post} = await ChannelScreen.postMessageAndVerify(message, testChannel.id, siteOneUrl);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await postListPostItem.tap();
        await wait(timeouts.TWO_SEC);
        await ThreadScreen.toBeVisible();
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await waitFor(PostOptionsScreen.pinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.pinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemPreHeaderText).toHaveText(pinnedText).withTimeout(timeouts.TEN_SEC);

        // # Open post options for message and tap on unpin from channel option
        await ThreadScreen.openPostOptionsFor(post.id, message);

        // Wait for unpin row visibility — post-options sheet overlay can block center-tap on open.
        await waitFor(PostOptionsScreen.unpinPostOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

        // * Verify pinned text is not displayed on the post pre-header
        await waitFor(postListPostItemPreHeaderText).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

});
