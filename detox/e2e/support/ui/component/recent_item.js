// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class RecentItem {
    testID = {
        recentSearchItemPrefix: 'search.recent_item.',
        recentSearchItemRemoveButtonSuffix: '.remove.button',
    }

    getRecentSearchItem = (searchTerms) => {
        const recentSearchItemTestID = `${this.testID.recentSearchItemPrefix}${searchTerms}`;
        const recentSearchItemRemoveButtonTestID = `${recentSearchItemTestID}${this.testID.recentSearchItemRemoveButtonSuffix}`;

        return {
            recentSearchItem: element(by.id(recentSearchItemTestID)),
            recentSearchItemRemoveButton: element(by.id(recentSearchItemRemoveButtonTestID)),
        };
    }
}

const recentItem = new RecentItem();
export default recentItem;
