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
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class RecentMentionsScreen {
    testID = {
        recentMentionsScreenPrefix: 'recent_mentions.',
        recentMentionsScreen: 'recent_mentions.screen',
        emptyTitle: 'recent_mentions.empty.title',
        emptyParagraph: 'recent_mentions.empty.paragraph',
    };

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
        await waitFor(this.recentMentionsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.recentMentionsScreen;
    };

    open = async () => {
        // # Open recent mentions screen
        await HomeScreen.mentionsTab.tap();

        return this.toBeVisible();
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

const recentMentionsScreen = new RecentMentionsScreen();
export default recentMentionsScreen;
