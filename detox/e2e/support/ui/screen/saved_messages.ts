// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    NavigationHeader,
    PostList,
} from '@support/ui/component';
import {
    HomeScreen,
    PostOptionsScreen,
} from '@support/ui/screen';
import {timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

class SavedMessagesScreen {
    testID = {
        savedMessagesScreenPrefix: 'saved_messages.',
        savedMessagesScreen: 'saved_messages.screen',
        emptyTitle: 'saved_messages.empty.title',
        emptyParagraph: 'saved_messages.empty.paragraph',
    };

    savedMessagesScreen = element(by.id(this.testID.savedMessagesScreen));
    emptyTitle = element(by.id(this.testID.emptyTitle));
    emptyParagraph = element(by.id(this.testID.emptyParagraph));

    // convenience props
    largeHeaderTitle = NavigationHeader.largeHeaderTitle;
    largeHeaderSubtitle = NavigationHeader.largeHeaderSubtitle;

    postList = new PostList(this.testID.savedMessagesScreenPrefix);

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
        await waitFor(this.savedMessagesScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.savedMessagesScreen;
    };

    open = async () => {
        // # Open saved messages screen
        await HomeScreen.savedMessagesTab.tap();

        return this.toBeVisible();
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // Poll for the post to become visible without waiting for idle bridge
        await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);

        // Dismiss keyboard by tapping on the post list (needed after posting a message)
        const flatList = this.postList.getFlatList();
        await flatList.scroll(100, 'down');
        await wait(timeouts.ONE_SEC);

        // # Open post options
        await postListPostItem.longPress(timeouts.TWO_SEC);
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

const savedMessagesScreen = new SavedMessagesScreen();
export default savedMessagesScreen;
