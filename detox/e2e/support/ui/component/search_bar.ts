// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class SearchBar {
    testID = {
        searchBarSuffix: 'search_bar',
        searchInputSuffix: 'search_bar.search.input',
        cancelButtonSuffix: 'search_bar.search.cancel.button',
        clearButtonSuffix: 'search_bar.search.clear.button',
    };

    getSearchBar = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.searchBarSuffix}`));
    };

    getSearchInput = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.searchInputSuffix}`)).atIndex(0);
    };

    getCancelButton = (screenPrefix: string) => {
        if (isAndroid()) {
            return element(by.id(`${screenPrefix}${this.testID.cancelButtonSuffix}`)).atIndex(0);
        }
        return element(by.text('Cancel').withAncestor(by.id(`${screenPrefix}${this.testID.searchBarSuffix}`))).atIndex(0);
    };

    getClearButton = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.clearButtonSuffix}`)).atIndex(0);
    };
}

const searchBar = new SearchBar();
export default searchBar;
