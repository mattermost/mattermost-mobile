// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    NavigationHeader,
    PostList,
} from '@support/ui/component';
import {
    ChannelScreen,
    HomeScreen,
    PostOptionsScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, longPressWithRetry, scrollElementIntoView, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
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
        if (isIos()) {
            await wait(timeouts.TWO_SEC);
            await HomeScreen.mentionsTab.tap();
            try {
                return await this.toBeVisible();
            } catch {
                // Tab tap can miss under sync-off — retry once.
                await HomeScreen.mentionsTab.tap();
                return this.toBeVisible();
            }
        }

        await HomeScreen.mentionsTab.tap();
        try {
            await waitFor(this.recentMentionsScreen).toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            await HomeScreen.mentionsTab.tap({x: 1, y: 1});
        }

        return this.toBeVisible();
    };

    openPostOptionsFor = async (postId: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId);
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

        // On Android, ensure the element is visible and not just existent
        if (isAndroid()) {
            await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);
        }

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

    // Assert through ChannelScreen.assertPostMessageEdited, the same helper the saved-messages,
    // pinned-messages, search-results and channel edit tests use — it already defines a
    // `recent_mentions_page` locator for this screen.
    //
    // The previous matcher, by.id(row).withDescendant(by.text(updatedMessage)), cannot match an
    // edited row on Android: markdown.tsx appends the edited_indicator node into the message's
    // last paragraph, RN flattens that paragraph into a single ReactTextView, and Espresso's
    // by.text() is an exact match — so the view's text is "<message>  Edited" and never equals
    // the message alone. assertPostMessageEdited matches /<message>.*Edited/ instead, which is
    // also the stronger assertion: it pins the message and the indicator to the same row.
    verifyPostEdited = async (postId: string, updatedMessage: string) => {
        try {
            await ChannelScreen.assertPostMessageEdited(postId, updatedMessage, 'recent_mentions_page');
        } catch {
            // Leave + re-enter the tab to force a fresh fetchRecentMentions, the same recovery
            // recentMentionPostListToBeVisible uses, then re-check.
            await HomeScreen.channelListTab.tap();
            await wait(timeouts.TWO_SEC);
            await HomeScreen.mentionsTab.tap();
            await this.toBeVisible();
            await ChannelScreen.assertPostMessageEdited(postId, updatedMessage, 'recent_mentions_page');
        }
    };
}

const recentMentionsScreen = new RecentMentionsScreen();
export default recentMentionsScreen;
