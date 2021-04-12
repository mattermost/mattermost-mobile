// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    MainSidebar,
    SearchBar,
} from '@support/ui/component';

class MoreDirectMessagesScreen {
    testID = {
        moreDirectMessagesScreenPrefix: 'more_direct_messages.',
        moreDirectMessagesScreen: 'more_direct_messages.screen',
        startButton: 'more_direct_messages.start.button',
        usersList: 'more_direct_messages.custom_list',
        userItem: 'more_direct_messages.custom_list.user_item',
        userItemDisplayUsername: 'more_direct_messages.custom_list.user_item.display_username',
    }

    moreDirectMessagesScreen = element(by.id(this.testID.moreDirectMessagesScreen));
    startButton = element(by.id(this.testID.startButton));
    usersList = element(by.id(this.testID.usersList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.moreDirectMessagesScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.moreDirectMessagesScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.moreDirectMessagesScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.moreDirectMessagesScreenPrefix);

    getUser = (userId, diplayUsername) => {
        const userItemTestID = `${this.testID.userItem}.${userId}`;
        const baseMatcher = by.id(userItemTestID);
        const userItemMatcher = diplayUsername ? baseMatcher.withDescendant(by.text(diplayUsername)) : baseMatcher;
        const userItemUsernameDisplayMatcher = by.id(this.testID.userItemDisplayUsername).withAncestor(userItemMatcher);

        return {
            userItem: element(userItemMatcher),
            userItemUsernameDisplay: element(userItemUsernameDisplayMatcher),
        };
    }

    getUserAtIndex = (index) => {
        return element(by.id(this.testID.userItem).withAncestor(by.id(this.testID.usersList))).atIndex(index);
    }

    getUserByDisplayUsername = (displayUsername) => {
        return element(by.text(displayUsername).withAncestor(by.id(this.testID.usersList)));
    }

    getDisplayUsernameAtIndex = (index) => {
        return element(by.id(this.testID.userItemDisplayUsername)).atIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.moreDirectMessagesScreen).toBeVisible();

        return this.moreDirectMessagesScreen;
    }

    open = async () => {
        // # Open more direct messages screen
        await MainSidebar.openMoreDirectMessagesButton.tap();

        return this.toBeVisible();
    }

    hasUserDisplayUsernameAtIndex = async (index, displayUsername) => {
        await expect(
            this.getDisplayUsernameAtIndex(index),
        ).toHaveText(displayUsername);
    }
}

const moreDirectMessagesScreen = new MoreDirectMessagesScreen();
export default moreDirectMessagesScreen;
