// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SearchBar {
    testID = {
        searchBarSuffix: 'search_bar',
        searchInputSuffix: 'search_bar.search.input',
        backButtonSuffix: 'search_bar.search.back.button',
        clearButtonSuffix: 'search_bar.search.clear.button',
    }

    getSearchBar = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.searchBarSuffix}`));
    }

    getSearchInput = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.searchInputSuffix}`)).atIndex(0);
    }

    getBackButton = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.backButtonSuffix}`)).atIndex(0);
    }

    getCancelButton = (screenPrefix) => {
        return element(by.text('Cancel').withAncestor(by.id(`${screenPrefix}${this.testID.searchBarSuffix}`))).atIndex(0);
    }

    getClearButton = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.clearButtonSuffix}`)).atIndex(0);
    }
}

const searchBar = new SearchBar();
export default searchBar;
