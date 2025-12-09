// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';
import {
    ChannelInfoScreen,
    PostOptionsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class PinnedMessagesScreen {
    testID = {
        pinnedMessagesScreenPrefix: 'pinned_messages.',
        pinnedMessagesScreen: 'pinned_messages.screen',
        backButton: 'screen.back.button',
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
        await waitFor(this.pinnedMessagesScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.pinnedMessagesScreen;
    };

    open = async () => {
        // # Open pinned messages screen
        await ChannelInfoScreen.pinnedMessagesOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.pinnedMessagesScreen).not.toBeVisible();
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress();
        await PostOptionsScreen.toBeVisible();
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
}

const pinnedMessagesScreen = new PinnedMessagesScreen();
export default pinnedMessagesScreen;
