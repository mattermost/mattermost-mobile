// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class RecentItem {
    testID = {
        recentItemPrefix: 'search.recent_item.',
    }

    getRecentItem = (searchTerms) => {
        return element(by.id(`${this.testID.recentItemPrefix}${searchTerms}`));
    }
}

const recentItem = new RecentItem();
export default recentItem;
