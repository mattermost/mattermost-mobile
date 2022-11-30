// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class NavigationHeader {
    testID = {
        backButton: 'navigation.header.back',
        headerTitle: 'navigation.header.title',
        headerSubtitle: 'navigation.header.subtitle',
        largeHeaderTitle: 'navigation.large_header.title',
        largeHeaderSubtitle: 'navigation.large_header.subtitle',
        searchInput: 'navigation.header.search_bar.search.input',
        searchClearButton: 'navigation.header.search_bar.search.clear.button',
        searchCancelButton: 'navigation.header.search_bar.search.cancel.button',
    };

    backButton = element(by.id(this.testID.backButton));
    headerTitle = element(by.id(this.testID.headerTitle));
    headerSubtitle = element(by.id(this.testID.headerSubtitle));
    largeHeaderTitle = element(by.id(this.testID.largeHeaderTitle));
    largeHeaderSubtitle = element(by.id(this.testID.largeHeaderSubtitle));
    searchInput = element(by.id(this.testID.searchInput));
    searchClearButton = element(by.id(this.testID.searchClearButton));
    searchCancelButton = element(by.id(this.testID.searchCancelButton));
}

const navigationHeader = new NavigationHeader();
export default navigationHeader;
