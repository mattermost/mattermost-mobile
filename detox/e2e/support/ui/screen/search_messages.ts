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

class SearchMessagesScreen {
    testID = {
        searchResultsScreenPrefix: 'search_results.',
        searchMessagesScreen: 'search_messages.screen',
        searchModifierHeader: 'search.modifier.header',
        searchModifierFrom: 'search.modifier.from',
        searchModifierIn: 'search.modifier.in',
        searchModifierOn: 'search.modifier.on',
        searchModifierAfter: 'search.modifier.after',
        searchModifierBefore: 'search.modifier.before',
        searchModifierExclude: 'search.modifier.exclude',
        searchModifierPhrases: 'search.modifier.phrases',
        teamPickerButton: 'team_picker.button',
    };

    searchMessagesScreen = element(by.id(this.testID.searchMessagesScreen));
    searchModifierHeader = element(by.id(this.testID.searchModifierHeader));
    searchModifierFrom = element(by.id(this.testID.searchModifierFrom));
    searchModifierIn = element(by.id(this.testID.searchModifierIn));
    searchModifierOn = element(by.id(this.testID.searchModifierOn));
    searchModifierAfter = element(by.id(this.testID.searchModifierAfter));
    searchModifierBefore = element(by.id(this.testID.searchModifierBefore));
    searchModifierExclude = element(by.id(this.testID.searchModifierExclude));
    searchModifierPhrases = element(by.id(this.testID.searchModifierPhrases));
    teamPickerButton = element(by.id(this.testID.teamPickerButton));

    // convenience props
    largeHeaderTitle = NavigationHeader.largeHeaderTitle;
    largeHeaderSubtitle = NavigationHeader.largeHeaderSubtitle;
    searchInput = NavigationHeader.searchInput;
    searchClearButton = NavigationHeader.searchClearButton;
    searchCancelButton = NavigationHeader.searchCancelButton;

    postList = new PostList(this.testID.searchResultsScreenPrefix);

    getFlatPostList = () => {
        return this.postList.getFlatList();
    };

    getPostListPostItem = (postId: string, text = '', postProfileOptions: any = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    };

    getPostMessageAtIndex = (index: number) => {
        return this.postList.getPostMessageAtIndex(index);
    };

    getTeamPickerIcon = (teamId: string) => {
        return element(by.id(`team_picker.${teamId}.team_icon`));
    };

    getRecentSearchItem = (searchTerm: string) => {
        return element(by.id(`search.recent_item.${searchTerm}`));
    };

    getRecentSearchItemRemoveButton = (searchTerm: string) => {
        return element(by.id(`search.recent_item.${searchTerm}.remove.button`)).atIndex(0);
    };

    toBeVisible = async () => {
        await wait(timeouts.ONE_SEC);
        await waitFor(this.searchMessagesScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.searchMessagesScreen;
    };

    open = async () => {
        // # Open search messages screen
        await HomeScreen.searchTab.tap();

        return this.toBeVisible();
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        await wait(timeouts.TWO_SEC);
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

const searchMessagesScreen = new SearchMessagesScreen();
export default searchMessagesScreen;
