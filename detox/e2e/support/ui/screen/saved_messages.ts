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
        await this.ensurePostVisible(postId, text);
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // # Open post options (with retry — longPress can fail on Android during animations)
        await longPressWithRetry(postListPostItem, PostOptionsScreen.postOptionsScreen);
        await wait(timeouts.TWO_SEC);
    };

    // Poll for a saved post row, refreshing the tab when the fetch lags (CI
    // 28416284905 MM-T4910_2: row missing after 10s despite a successful save).
    waitForPostInList = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // ponytail: increased MAX_REFETCHES 3→5. CI 28476574698: saved post not in
        // flagged-posts index even after 3 tab refreshes. More refreshes give the
        // server time to index. Fixes E2E: MM-T4910_2/3/4/5, MM-T4909_4,
        // MM-T4918_5, MM-T5294_11. Revert if CI shows regression.
        const MAX_REFETCHES = 5;

        /* eslint-disable no-await-in-loop -- poll before each tab refresh */
        for (let attempt = 1; attempt <= MAX_REFETCHES; attempt++) {
            try {
                await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
                return;
            } catch (e) {
                if (attempt === MAX_REFETCHES) {
                    throw e;
                }

                await HomeScreen.channelListTab.tap();
                await wait(timeouts.ONE_SEC);
                await HomeScreen.savedMessagesTab.tap();
                await this.toBeVisible();
            }
        }
        /* eslint-enable no-await-in-loop */
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
        const MAX_REFETCHES = 3;

        /* eslint-disable no-await-in-loop -- poll for row removal before each tab refresh */
        for (let attempt = 1; attempt <= MAX_REFETCHES; attempt++) {
            try {
                await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);
                return;
            } catch (e) {
                if (attempt === MAX_REFETCHES) {
                    throw e;
                }

                await HomeScreen.channelListTab.tap();
                await wait(timeouts.ONE_SEC);
                await HomeScreen.savedMessagesTab.tap();
                await this.toBeVisible();
            }
        }
        /* eslint-enable no-await-in-loop */
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
