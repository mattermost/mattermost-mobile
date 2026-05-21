// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';
import {
    ChannelInfoScreen,
    PostOptionsScreen,
} from '@support/ui/screen';
import {isAndroid, longPressWithRetry, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class PinnedMessagesScreen {
    testID = {
        pinnedMessagesScreenPrefix: 'pinned_messages.',
        pinnedMessagesScreen: 'pinned_messages.screen',
        backButton: 'navigation.header.back',
        emptyTitle: 'pinned_messages.empty.title',
        emptyParagraph: 'pinned_messages.empty.paragraph',
    };

    pinnedMessagesScreen = element(by.id(this.testID.pinnedMessagesScreen));
    backButton = element(by.id(this.testID.backButton));
    emptyTitle = element(by.id(this.testID.emptyTitle));
    emptyParagraph = element(by.id(this.testID.emptyParagraph));

    postList = new PostList(this.testID.pinnedMessagesScreenPrefix);

    getFlatPostList = () => {
        return this.postList.getFlatList();
    };

    getPostListPostItem = (postId: string, text = '', postProfileOptions: any = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    };

    getPostMessageAtIndex = (index: number) => {
        return this.postList.getPostMessageAtIndex(index);
    };

    toBeVisible = async () => {
        const timeout = isAndroid() ? timeouts.HALF_MIN : timeouts.TEN_SEC;

        // On Android the JS bridge stays busy during the navigation push animation,
        // the ActivityIndicator spinner animation, and the fetchPinnedPosts network
        // request + WatermelonDB writes.  waitFor().toExist().withTimeout() blocks
        // until the bridge is idle *before* querying the hierarchy, which means it
        // never fires on CI emulators (BridgeIdlingResource timeout).
        // Use the polling helper instead — it checks expect().toExist() directly
        // every 500ms without waiting for bridge idle.
        if (isAndroid()) {
            await waitForElementToExist(this.pinnedMessagesScreen, timeout);
        } else {
            await waitFor(this.pinnedMessagesScreen).toExist().withTimeout(timeout);
        }

        return this.pinnedMessagesScreen;
    };

    open = async () => {
        // # Open pinned messages screen
        await ChannelInfoScreen.pinnedMessagesOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        // iOS 26: UITransitionView glass overlay makes the native 'Back' label button
        // non-hittable. A swipe-back gesture from the screen container's left edge
        // bypasses the overlay and triggers the interactive pop gesture.
        //
        // Android API 35: tapping the Toolbar 'Navigate up' button fires via Espresso
        // but the navigation event does not propagate through expo-router on API 35.
        // device.pressBack() triggers useAndroidHardwareBackHandler(Screens.PINNED_MESSAGES,
        // navigateBack) which reliably pops the screen.
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await this.pinnedMessagesScreen.swipe('right', 'fast', 0.8, 0.05, 0.5);
        }
        await waitFor(this.pinnedMessagesScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // Poll for the post to become visible without waiting for idle bridge
        await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);

        // Dismiss keyboard by tapping on the post list (needed after posting a message)
        const flatList = this.postList.getFlatList();
        try {
            await flatList.scroll(100, 'down');
        } catch {
            // Ignore scroll failures when the list is already at the boundary.
        }
        await wait(timeouts.ONE_SEC);

        // # Open post options (with retry — longPress can fail on Android during animations)
        await longPressWithRetry(postListPostItem, PostOptionsScreen.postOptionsScreen);
        await wait(timeouts.TWO_SEC);
    };

    hasPostMessage = async (postId: string, postMessage: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, postMessage);
        await expect(postListPostItem).toBeVisible();
    };

    hasPostMessageAtIndex = async (index: number, postMessage: string) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    };

    verifyReplyCount = async (postId: string, replyCount: number) => {
        const replyCountElement = element(
            by.id(`pinned_messages.post_list.post.${postId}`).
                withDescendant(by.text(`${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`)),
        );
        if (isAndroid()) {
            await waitForElementToBeVisible(replyCountElement, timeouts.TEN_SEC);
        } else {
            await expect(replyCountElement).toBeVisible();
        }
    };

    verifyFollowingLabel = async (postId: string, following: boolean = false) => {
        const followingLabelElement = element(
            by.id(`pinned_messages.post_list.post.${postId}`).
                withDescendant(by.text(following? 'Following' : 'Follow')),
        );
        if (isAndroid()) {
            // After posting a reply, createThreadFromNewPost sets isFollowing=true
            // immediately in the DB. However the WatermelonDB observer + React re-render
            // cycle can take a few hundred ms on CI emulators, so use the polling
            // helper instead of a plain expect() to avoid BridgeIdlingResource contention.
            await waitForElementToBeVisible(followingLabelElement, timeouts.HALF_MIN);
        } else {
            await expect(followingLabelElement).toBeVisible();
        }
    };
}

const pinnedMessagesScreen = new PinnedMessagesScreen();
export default pinnedMessagesScreen;
