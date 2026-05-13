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
import {isAndroid, longPressWithRetry, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

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
        await waitFor(this.recentMentionsScreen).toExist().withTimeout(timeout);

        return this.recentMentionsScreen;
    };

    recentMentionPostListToBeVisible = async () => {
        await waitFor(this.recentMentionPostList).toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    open = async () => {
        // # Open recent mentions screen
        await HomeScreen.mentionsTab.tap();

        return this.toBeVisible();
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // Poll for the post to become visible without waiting for idle bridge
        await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);

        // Choose the safest longPress target inside the post:
        // - post_pre_header.text (the "Saved"/"Pinned" indicator) has no interactive children
        //   and is at the very top of the post card — use it when present.
        // - Fall back to the timestamp (post_header.date_time) which sits in the header row
        //   away from the @mention message body.
        const postPreHeaderText = element(
            by.id('post_pre_header.text').withAncestor(by.id(`${this.testID.recentMentionPostList}.${postId}`)),
        );
        const postHeaderDateTime = element(
            by.id('post_header.date_time').withAncestor(by.id(`${this.testID.recentMentionPostList}.${postId}`)),
        );
        let longPressTarget = postHeaderDateTime;
        try {
            await waitFor(postPreHeaderText).toExist().withTimeout(timeouts.TWO_SEC);
            longPressTarget = postPreHeaderText;
        } catch (_e) {
            // No pre-header (post is not saved/pinned) — fall back to timestamp
        }
        await waitFor(longPressTarget).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
}

const recentMentionsScreen = new RecentMentionsScreen();
export default recentMentionsScreen;
