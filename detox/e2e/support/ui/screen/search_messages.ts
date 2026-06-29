// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    NavigationHeader,
    PostList,
} from '@support/ui/component';
import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {
    HomeScreen,
    PostOptionsScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, longPressWithScrollRetry, timeouts, wait, waitForElementToBeVisible, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        // Recent rows can render twice in the hierarchy on Android (wrapper + row).
        return element(by.id(`search.recent_item.${searchTerm}`)).atIndex(0);
    };

    getRecentSearchItemRemoveButton = (searchTerm: string) => {
        return element(by.id(`search.recent_item.${searchTerm}.remove.button`)).atIndex(0);
    };

    removeRecentSearchItem = async (searchTerm: string) => {
        const removeButton = this.getRecentSearchItemRemoveButton(searchTerm);
        await waitFor(this.getRecentSearchItem(searchTerm)).toExist().withTimeout(timeouts.TEN_SEC);
        if (isIos()) {
            try {
                await waitFor(removeButton).toBeVisible(50).whileElement(by.id('search.recents_list')).scroll(100, 'down');
            } catch { /* item already in view */ }
        }
        await waitFor(removeButton).toExist().withTimeout(timeouts.TEN_SEC);
        await removeButton.tap();
    };

    toBeVisible = async () => {
        await wait(timeouts.ONE_SEC);
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitFor(this.searchMessagesScreen).toExist().withTimeout(timeout);

        return this.searchMessagesScreen;
    };

    open = async () => {
        await HomeScreen.toBeVisible();
        await dismissKnownModals(2);

        await waitFor(HomeScreen.searchTab).toExist().withTimeout(timeouts.TEN_SEC);

        // Corner-tap is for Android overlays; iOS CI fails to open search with {x:1,y:1} (MM-T5294_6–9).
        if (isIos()) {
            await HomeScreen.searchTab.tap();
        } else {
            await HomeScreen.searchTab.tap({x: 1, y: 1});
        }

        return this.toBeVisible();
    };

    close = async () => {
        if (isIos()) {
            await this.searchCancelButton.tap();
        } else {
            // Search is a bottom-tab — pressBack only dismisses the keyboard, not the tab.
            await waitFor(HomeScreen.channelListTab).toExist().withTimeout(timeouts.TEN_SEC);
            await HomeScreen.channelListTab.tap();
        }
        await waitForElementToNotExist(this.searchMessagesScreen, timeouts.TWENTY_SEC);
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);

        // Dismiss keyboard first so the 75%-visibility check in waitForElementToBeVisible
        // doesn't fail on Android when the keyboard is still covering the bottom of the list.
        const flatList = this.postList.getFlatList();
        try {
            await flatList.scroll(100, 'down');
        } catch {
            // List too short to scroll — keyboard already dismissed or not open
        }
        await wait(timeouts.ONE_SEC);

        // Poll for the post to become visible without waiting for idle bridge
        await waitForElementToBeVisible(postListPostItem, timeouts.TEN_SEC);

        const longPressTarget = isAndroid()
            ? element(by.id(`${this.testID.searchResultsScreenPrefix}post_list.post.${postId}`))
            : postListPostItem;

        await longPressWithScrollRetry(
            longPressTarget,
            by.id(this.postList.testID.flatList),
            PostOptionsScreen.postOptionsScreen,
        );
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
