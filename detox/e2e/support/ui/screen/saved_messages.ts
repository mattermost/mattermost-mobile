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
import {isAndroid, longPressWithRetry, scrollElementIntoView, timeouts, wait, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
import {by, expect, waitFor} from 'detox';

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
        await this.ensurePostVisible(postId, text);
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // # Open post options (with retry — longPress can fail on Android during animations)
        await longPressWithRetry(postListPostItem, PostOptionsScreen.postOptionsScreen);
        await wait(timeouts.TWO_SEC);
    };

    // Tab-switch once if the first paint still lags the preference write.
    waitForPostInList = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        try {
            await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            await HomeScreen.channelListTab.tap();
            await wait(timeouts.ONE_SEC);
            await HomeScreen.savedMessagesTab.tap();
            await this.toBeVisible();
            await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
        }
    };

    ensurePostVisible = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        const flatList = this.postList.getFlatList();

        await this.waitForPostInList(postId, text);

        try {
            await flatList.scrollTo('top');
        } catch {
            // List too short to scroll
        }
        await wait(timeouts.ONE_SEC);

        try {
            await waitFor(postListPostItem).toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            if (isAndroid()) {
                try {
                    await waitFor(postListPostItem).
                        toExist().
                        whileElement(by.id(this.postList.testID.flatList)).
                        scroll(250, 'down');
                } catch {
                    // Fall through to scrollElementIntoView
                }
            }
        }

        await scrollElementIntoView(postListPostItem, by.id(this.postList.testID.flatList));
        await waitForElementToExist(postListPostItem, timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);
    };

    verifyPostUnsaved = async (postId: string) => {
        const postListPostItem = element(by.id(`${this.postList.testID.postListPostItem}.${postId}`));

        try {
            await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            await HomeScreen.channelListTab.tap();
            await wait(timeouts.ONE_SEC);
            await HomeScreen.savedMessagesTab.tap();
            await this.toBeVisible();
            await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);
        }
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
