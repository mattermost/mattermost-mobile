// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    PostOptions,
    RecentItem,
    SearchBar,
} from '@support/ui/component';
import {
    ChannelScreen,
    SearchResultPostScreen,
} from '@support/ui/screen';

class SearchScreen {
    testID = {
        searchScreenPrefix: 'search.',
        searchScreen: 'search.screen',
        searchFromSection: 'search.from_section',
        searchInSection: 'search.in_section',
        searchOnSection: 'search.on_section',
        searchAfterSection: 'search.after_section',
        searchBeforeSection: 'search.before_section',
        searchResultsList: 'search.results_list',
    };

    searchScreen = element(by.id(this.testID.searchScreen));
    searchFromSection = element(by.id(this.testID.searchFromSection));
    searchInSection = element(by.id(this.testID.searchInSection));
    searchOnSection = element(by.id(this.testID.searchOnSection));
    searchAfterSection = element(by.id(this.testID.searchAfterSection));
    searchBeforeSection = element(by.id(this.testID.searchBeforeSection));
    searchResultsList = element(by.id(this.testID.searchResultsList));

    searchFromModifier = 'from:';
    searchInModifier = 'in:';
    searchOnModifier = 'on:';
    searchAfterModifier = 'after:';
    searchBeforeModifier = 'before:';

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.searchScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.searchScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.searchScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.searchScreenPrefix);

    getRecentSearchItem = (searchTerms) => {
        return RecentItem.getRecentSearchItem(searchTerms);
    };

    getSearchResultPostItem = (postId, text, postProfileOptions = {}) => {
        return SearchResultPostScreen.getPost(postId, text, postProfileOptions);
    };

    getSearchResultPostMessageAtIndex = (index) => {
        return SearchResultPostScreen.getPostMessageAtIndex(index);
    };

    toBeVisible = async () => {
        await expect(this.searchScreen).toBeVisible();

        return this.searchScreen;
    };

    open = async () => {
        // # Open search screen
        await ChannelScreen.channelSearchButton.tap();

        return this.toBeVisible();
    };

    cancel = async () => {
        await this.cancelButton.tap();
        await expect(this.searchScreen).not.toBeVisible();
    };

    clear = async () => {
        await this.clearButton.tap();
        await expect(this.clearButton).not.toExist();
    };

    openPostOptionsFor = async (postId, text) => {
        const {searchResultPostItem} = await this.getSearchResultPostItem(postId, text);
        await expect(searchResultPostItem).toBeVisible();

        // # Open post options
        await searchResultPostItem.longPress();
        await PostOptions.toBeVisible();
    };

    hasSearchResultPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getSearchResultPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    };
}

const searchScreen = new SearchScreen();
export default searchScreen;
