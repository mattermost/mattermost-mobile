// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';

class PermalinkScreen {
    testID = {
        permalinkScreenPrefix: 'permalink.',
        permalinkScreen: 'permalink.screen',
        permalinkPostList: 'permalink.post_list',
        searchJump: 'permalink.search.jump',
    }

    permalinkScreen = element(by.id(this.testID.permalinkScreen));
    permalinkPostList = element(by.id(this.testID.permalinkPostList));
    searchJump = element(by.id(this.testID.searchJump));

    postList = new PostList(this.testID.permalinkScreenPrefix);

    getPostListPostItem = (postId, text, postProfileOptions = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    }

    getPostMessageAtIndex = (index) => {
        return this.postList.getPostMessageAtIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.permalinkScreen).toBeVisible();

        return this.permalinkScreen;
    }

    jumpToRecentMessages = async () => {
        // # Jump to recent messages
        await this.searchJump.tap();
        await expect(this.permalinkScreen).not.toBeVisible();
    }

    hasLongPostMessage = async (postMessage) => {
        await expect(
            this.getLongPostMessage(),
        ).toHaveText(postMessage);
    }

    hasPostMessage = async (postId, postMessage) => {
        const {postListPostItem} = this.getPostListPostItem(postId, postMessage);
        await expect(postListPostItem).toBeVisible();
    }

    hasPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    }
}

const permalinkScreen = new PermalinkScreen();
export default permalinkScreen;
