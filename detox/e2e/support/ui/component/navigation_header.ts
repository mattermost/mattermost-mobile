// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class NavigationHeader {
    testID = {
        backButton: 'navigation.header.back',
        headerTitle: 'navigation.header.title',
        headerSubtitle: 'navigation.header.subtitle',
    };

    backButton = element(by.id(this.testID.backButton));
    headerTitle = element(by.id(this.testID.headerTitle));
    headerSubtitle = element(by.id(this.testID.headerSubtitle));
}

const navigationHeader = new NavigationHeader();
export default navigationHeader;
