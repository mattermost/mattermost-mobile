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
import {isAndroid, longPressWithRetry, scrollElementIntoView, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class RecentMentionsScreen {
    testID = {
        recentMentionPostList: 'recent_mentions.post_list.post',
        recentMentionsScreenPrefix: 'recent_mentions.',
        recentMentionsScreen: 'recent_mentions.screen',
        emptyTitle: 'recent_mentions.empty.title',
        emptyParagraph: 'recent_mentions.empty.paragraph',
    };

    recentMentionPostList = element(by.id(this.testID.recentMentionPostList));
    recentMentionsScreen = element(by.id(this.testID.recentMentionsScreen));
    emptyTitle = element(by.id(this.testID.emptyTitle));
    emptyParagraph = element(by.id(this.testID.emptyParagraph));

    // convenience props
    largeHeaderTitle = NavigationHeader.largeHeaderTitle;
    largeHeaderSubtitle = NavigationHeader.largeHeaderSubtitle;

    postList = new PostList(this.testID.recentMentionsScreenPrefix);

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
        await waitForElementToExist(this.recentMentionsScreen, timeout);

        return this.recentMentionsScreen;
    };

    recentMentionPostListToBeVisible = async () => {
        const MAX_REFETCHES = 3;
        /* eslint-disable no-await-in-loop -- sequential by design: each retry must
           complete the back→open dance before the next visibility poll. */
        for (let attempt = 1; attempt <= MAX_REFETCHES; attempt++) {
            try {
                await waitForElementToBeVisible(this.recentMentionPostList, timeouts.TEN_SEC);
                return;
            } catch (e) {
                if (attempt === MAX_REFETCHES) {
                    throw e;
                }

                // Force a fresh fetchRecentMentions by leaving + re-entering the tab.
                await HomeScreen.channelListTab.tap();
                await wait(timeouts.TWO_SEC);
                await HomeScreen.mentionsTab.tap();
                await this.toBeVisible();
            }
        }
        /* eslint-enable no-await-in-loop */
    };

    open = async () => {
        // # Open recent mentions screen
        await HomeScreen.mentionsTab.tap();

        return this.toBeVisible();
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        const flatList = this.postList.getFlatList();

        try {
            await flatList.scrollTo('top');
        } catch {
            // List too short to scroll
        }
        try {
            await flatList.scroll(100, 'down');
        } catch {
            // List too short to scroll; keyboard already dismissed
        }
        await wait(timeouts.ONE_SEC);

        try {
            await waitForElementToExist(postListPostItem, timeouts.FIVE_SEC);
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

        const longPressTarget = element(by.id(`${this.testID.recentMentionPostList}.${postId}`));
        await waitForElementToExist(longPressTarget, timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);

        // # Open post options (with retry — longPress can fail on Android during animations)
        await longPressWithRetry(longPressTarget, PostOptionsScreen.postOptionsScreen);
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

    // Wait for the edited_indicator to render on a post after an edit.
    // The recent_mentions list doesn't always re-render the row on POST_EDITED
    // before the FlashList recycles it (CI 28392181656 / 28375328964 / 28385155791
    // MM-T4909_3: `edited_indicator` never appeared in 10s despite a successful
    // edit — 263 failed `not null` polls). Poll and, on failure, force a fresh
    // fetchRecentMentions by leaving + re-entering the mentions tab (the same
    // refresh pattern as recentMentionPostListToBeVisible) so the row re-mounts
    // at the top with the indicator.
    verifyPostEdited = async (postId: string) => {
        const editedIndicator = element(
            by.id('edited_indicator').withAncestor(by.id(`${this.testID.recentMentionPostList}.${postId}`)),
        );
        const MAX_REFETCHES = 3;

        /* eslint-disable no-await-in-loop -- poll for the indicator before each tab refresh */
        for (let attempt = 1; attempt <= MAX_REFETCHES; attempt++) {
            try {
                await waitFor(editedIndicator).toExist().withTimeout(timeouts.TEN_SEC);
                return;
            } catch (e) {
                if (attempt === MAX_REFETCHES) {
                    throw e;
                }

                // Force a fresh fetchRecentMentions by leaving + re-entering the tab.
                await HomeScreen.channelListTab.tap();
                await wait(timeouts.ONE_SEC);
                await HomeScreen.mentionsTab.tap();
                await this.toBeVisible();
            }
        }
        /* eslint-enable no-await-in-loop */
    };
}

const recentMentionsScreen = new RecentMentionsScreen();
export default recentMentionsScreen;
