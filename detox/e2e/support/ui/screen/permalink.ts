// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class PermalinkScreen {
    testID = {
        permalinkScreenPrefix: 'permalink.',
        permalinkScreen: 'permalink.screen',
        permalinkPostList: 'permalink.post_list',
        jumpToRecentMessagesButton: 'permalink.jump_to_recent_messages.button',
    };

    permalinkScreen = element(by.id(this.testID.permalinkScreen));
    permalinkPostList = element(by.id(this.testID.permalinkPostList));
    jumpToRecentMessagesButton = element(by.id(this.testID.jumpToRecentMessagesButton));

    postList = new PostList(this.testID.permalinkScreenPrefix);

    getPostListPostItem = (postId: string, text = '', postProfileOptions = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    };

    getPostMessageAtIndex = (index: number) => {
        return this.postList.getPostMessageAtIndex(index);
    };

    toBeVisible = async () => {
        // Use HALF_MIN on both platforms:
        // - Android: edge-to-edge insets can make toBeVisible() fail; use toExist()
        // - iOS: after a "Join channel" flow the screen reloads posts via useEffect,
        //   which can take several seconds on a loaded simulator/CI runner.
        // toExist() is sufficient — the SafeAreaView with testID='permalink.screen'
        // is always mounted while the modal is open, regardless of loading state.
        await waitFor(this.permalinkScreen).toExist().withTimeout(timeouts.HALF_MIN);

        return this.permalinkScreen;
    };

    jumpToRecentMessages = async () => {
        // # Jump to recent messages
        await waitFor(this.jumpToRecentMessagesButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.jumpToRecentMessagesButton.tap();
        await expect(this.permalinkScreen).not.toBeVisible();

        // iOS 26.2 liquid-glass dimming overlay takes longer than 1s to clear
        // after the permalink screen dismisses. Use FOUR_SEC to ensure the
        // channel_list.screen transition completes before the next assertion.
        await wait(timeouts.FOUR_SEC);
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
}

const permalinkScreen = new PermalinkScreen();
export default permalinkScreen;
