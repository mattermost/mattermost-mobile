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

    // expo-router keeps stacked screens mounted off-screen, so navigation.header.back
    // can match several headers at once (e.g. a stale Thread header still mounted
    // above the visible Channel header). The base screen's header is index 0; a
    // pushed screen's header is the higher index. A fresh matcher is built per call
    // — chaining .atIndex() on a shared element mutates it, so never reuse the
    // returned element across attempts.
    tapBackButton = async (index = 0) => {
        await element(by.id(this.testID.backButton)).atIndex(index).tap();
    };
}

const navigationHeader = new NavigationHeader();
export default navigationHeader;
