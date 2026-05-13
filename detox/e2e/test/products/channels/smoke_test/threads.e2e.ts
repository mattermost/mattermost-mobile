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
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Threads', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    let testChannel: any;

    beforeAll(async () => {
        // # Admin login required before apiInit (which uses admin endpoints)
        await User.apiAdminLogin(siteOneUrl);

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Enable Collapsed Reply Threads so the follow button appears in thread navigation
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                CollapsedThreads: 'always_on',
                ThreadAutoFollow: true,
            },
        });

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

    it('MM-T4811_1 - should be able to create a thread, follow/unfollow a thread, mark a thread as read/unread, and reply to thread', async () => {
        // # Create a thread and unfollow thread via thread navigation
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await waitFor(ThreadScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ThreadScreen.postMessage(`${parentMessage} reply`);

        // * Verify thread is followed by user by default via thread navigation
        // Disable Detox sync: each detoxExpect().toBeVisible() waits for bridge idle
        // before querying the view hierarchy. On slow emulators the JS bridge stays busy
        // for 15-20s stretches after a send (keyboard animation + WatermelonDB writes),
        // which blocks both the poll and the thread_updated WebSocket event dispatch.
        // With sync disabled, polls run every 500ms directly against the native view
        // hierarchy; sync is re-enabled before each tap so gestures remain reliable.
        await device.disableSynchronization();
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.HALF_MIN);
        await device.enableSynchronization();

        // # Unfollow thread via thread navigation
        await ThreadScreen.followingButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not followed by user via thread navigation
        await device.disableSynchronization();
        await waitForElementToBeVisible(ThreadScreen.followButton, timeouts.TEN_SEC);
        await device.enableSynchronization();

        // # Follow thread via thread navigation
        await ThreadScreen.followButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is followed by user via thread navigation
        await device.disableSynchronization();
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.TEN_SEC);
        await device.enableSynchronization();

        // # Go back to channel list screen, then go to global threads screen, tap on all your threads button, open thread options for thread, tap on mark as unread option, and tap on unread threads button
        await ThreadScreen.back();
        await ChannelScreen.back();

        // Note: Commenting out reloadReactNative as it can cause ANR on Android
        // await device.reloadReactNative();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.headerAllThreadsButton.tap();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsUnreadOption.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify thread is marked unread in all threads before switching filters.
        // The unread badge/footer update drives membership in the Unreads tab.
        await device.disableSynchronization();
        await waitForElementToBeVisible(GlobalThreadsScreen.getThreadItem(parentPost.id), timeouts.HALF_MIN);
        await waitFor(GlobalThreadsScreen.getThreadItemUnreadDotBadge(parentPost.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(GlobalThreadsScreen.getThreadItemFooterUnreadReplies(parentPost.id)).toHaveText('1 new reply').withTimeout(timeouts.TEN_SEC);
        await device.enableSynchronization();

        await GlobalThreadsScreen.headerUnreadThreadsButton.tap();

        // * Verify thread is displayed in unread threads section
        // Disable sync: tab filter + WS refresh can keep the bridge busy while the unread list repopulates.
        await device.disableSynchronization();
        await waitForElementToBeVisible(GlobalThreadsScreen.getThreadItem(parentPost.id), timeouts.HALF_MIN);
        await device.enableSynchronization();

        // # Open thread options for thread and tap on mark as read option
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.markAsReadOption.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify thread is not displayed anymore in unread threads section
        await device.disableSynchronization();
        await waitFor(GlobalThreadsScreen.getThreadItem(parentPost.id)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await device.enableSynchronization();

        // # Tap on all your threads button, tap on the thread, and add new reply to thread
        await GlobalThreadsScreen.headerAllThreadsButton.tap();
        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();
        const newReplyMessage = `${parentMessage} new reply`;
        await ThreadScreen.postMessage(newReplyMessage);

        // * Verify new reply is posted
        const {post: newReplyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ThreadScreen.getPostListPostItem(newReplyPost.id, newReplyMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await GlobalThreadsScreen.back();
    });

    it('MM-T4811_2 - should be able to save/unsave a thread and open a thread in channel', async () => {
        // # Create a thread, go back to channel list screen, then go to global threads screen, open thread options for thread, tap on save option, and tap on thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostItem2} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem2).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        const replyMessage = `${parentMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);
        await ThreadScreen.back();
        await ChannelScreen.back();
        await GlobalThreadsScreen.open();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await ThreadOptionsScreen.saveThreadOption.tap();

        // Wait for PREFERENCES_CHANGED WS event to be processed before proceeding.
        // On a heavily loaded simulator (Xcode + Metro + simulator + server all competing
        // for CPU), the server's async WS hub can delay broadcasting the event by 20-30s.
        // If this event arrives after the local unsave delete (PREFERENCES_DELETED is a
        // no-op since the record is already gone), it re-creates the preference and isSaved
        // stays true permanently. Waiting here ensures the WS event fires while the record
        // still exists (upsert no-op), so the subsequent unsave delete is the last write.
        await device.disableSynchronization();
        await wait(timeouts.HALF_MIN);
        await device.enableSynchronization();

        await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Go back to global threads screen, open thread options for thread, tap on unsave option
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await waitFor(ThreadOptionsScreen.unsaveThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ThreadOptionsScreen.unsaveThreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify saved text is not displayed on the post pre-header
        // Use a retry loop to handle the WS race: if the server's delayed PREFERENCES_CHANGED
        // event (from the save) re-creates the preference after our delete, the pre-header "Saved"
        // text will reappear. We re-open thread options and tap unsave again until the pre-header
        // is confirmed gone. The pre-header is on the root post which is always visible when the
        // thread opens — no scrolling needed, unlike the ThreadOverview save button.
        const UNSAVE_RETRY_LIMIT = 5;
        let unsaveVerified = false;
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < UNSAVE_RETRY_LIMIT; attempt++) {
            await waitFor(GlobalThreadsScreen.getThreadItem(parentPost.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await GlobalThreadsScreen.getThreadItem(parentPost.id).tap();

            // Poll for pre-header to be gone (sync disabled so WS events don't block the check).
            // waitFor(element).toBeVisible() throws when element is not visible or not found;
            // catching the error means isSaved=false and the pre-header is gone.
            await device.disableSynchronization();
            let preHeaderStillVisible = false;
            try {
                await waitFor(postListPostItemPreHeaderText).toBeVisible().withTimeout(timeouts.FIVE_SEC);
                preHeaderStillVisible = true;
            } catch {
                preHeaderStillVisible = false;
            }
            await device.enableSynchronization();

            if (!preHeaderStillVisible) {
                unsaveVerified = true;
                break;
            }

            // Pre-header still visible (isSaved=true) — go back and re-unsave via thread options
            await ThreadScreen.back();
            if (attempt < UNSAVE_RETRY_LIMIT - 1) {
                await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
                await waitFor(ThreadOptionsScreen.unsaveThreadOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await ThreadOptionsScreen.unsaveThreadOption.tap();
                await wait(timeouts.FIVE_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */

        if (!unsaveVerified) {
            throw new Error('Thread unsave did not complete after retries — "Saved" pre-header still visible');
        }

        // Confirm pre-header is gone (we are currently in the thread)
        await expect(postListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to global threads screen, open thread options for thread, tap on open in channel option, and jump to recent messages
        await ThreadScreen.back();
        await GlobalThreadsScreen.openThreadOptionsFor(parentPost.id);
        await waitFor(ThreadOptionsScreen.openInChannelOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ThreadOptionsScreen.openInChannelOption.tap();
        await waitFor(PermalinkScreen.permalinkScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and thread is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await GlobalThreadsScreen.back();
    });
});
