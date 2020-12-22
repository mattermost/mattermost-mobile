// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
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
    }

    searchScreen = element(by.id(this.testID.searchScreen));
    searchFromSection = element(by.id(this.testID.searchFromSection));
    searchInSection = element(by.id(this.testID.searchInSection));
    searchOnSection = element(by.id(this.testID.searchOnSection));
    searchAfterSection = element(by.id(this.testID.searchAfterSection));
    searchBeforeSection = element(by.id(this.testID.searchBeforeSection));

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
        return RecentItem.getRecentItem(searchTerms);
    }

    getSearchResultPostItem = (postId, text) => {
        return SearchResultPostScreen.getPost(postId, text);
    }

    getSearchResultPostMessageAtIndex = (index) => {
        return SearchResultPostScreen.getPostMessageAtIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.searchScreen).toBeVisible();

        return this.searchScreen;
    }

    open = async () => {
        // # Open search screen
        await ChannelScreen.channelSearchButton.tap();

        return this.toBeVisible();
    }

    cancel = async () => {
        await this.cancelButton.tap();
        await expect(this.searchScreen).not.toBeVisible();
    }

    clear = async () => {
        await this.clearButton.tap();
        await expect(this.clearButton).not.toExist();
    }

    hasSearchResultPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getSearchResultPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    }
}

const searchScreen = new SearchScreen();
export default searchScreen;
