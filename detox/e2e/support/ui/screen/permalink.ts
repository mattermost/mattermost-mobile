// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

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
        await wait(timeouts.ONE_SEC);
        await expect(this.permalinkScreen).toBeVisible();

        return this.permalinkScreen;
    };

    jumpToRecentMessages = async () => {
        // # Jump to recent messages
        await wait(timeouts.ONE_SEC);
        await this.jumpToRecentMessagesButton.tap();
        await expect(this.permalinkScreen).not.toBeVisible();
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
