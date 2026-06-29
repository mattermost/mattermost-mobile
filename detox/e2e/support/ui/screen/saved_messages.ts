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
import {isAndroid, longPressWithRetry, scrollElementIntoView, timeouts, wait, waitForElementToBeVisible, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitFor(this.savedMessagesScreen).toExist().withTimeout(timeout);

        return this.savedMessagesScreen;
    };

    open = async () => {
        // # Open saved messages screen
        await waitFor(HomeScreen.savedMessagesTab).toExist().withTimeout(timeouts.TEN_SEC);
        await HomeScreen.savedMessagesTab.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await waitFor(HomeScreen.channelListTab).toExist().withTimeout(timeouts.TEN_SEC);
        await HomeScreen.channelListTab.tap();
        await waitForElementToNotExist(this.savedMessagesScreen, timeouts.TWENTY_SEC);
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        const flatList = this.postList.getFlatList();

        // Dismiss keyboard first so visibility checks are not blocked by the soft keyboard.
        try {
            await flatList.scroll(100, 'down');
        } catch {
            // List too short to scroll; keyboard already dismissed
        }
        await wait(timeouts.ONE_SEC);

        await scrollElementIntoView(postListPostItem, by.id(this.postList.testID.flatList));
        await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);
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
}

const savedMessagesScreen = new SavedMessagesScreen();
export default savedMessagesScreen;
