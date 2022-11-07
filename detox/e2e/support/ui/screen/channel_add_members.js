// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    MainSidebar,
    SearchBar,
} from '@support/ui/component';

class ChannelAddMembersScreen {
    testID = {
        channelAddMembersScreenPrefix: 'channel_add_members.',
        channelAddMembersScreen: 'channel_add_members.screen',
        addButton: 'channel_add_members.add.button',
        backButton: 'screen.back.button',
        usersList: 'channel_add_members.custom_list',
        userItem: 'channel_add_members.custom_list.user_item',
        userItemDisplayUsername: 'channel_add_members.custom_list.user_item.display_username',
    };

    channelAddMembersScreen = element(by.id(this.testID.channelAddMembersScreen));
    addButton = element(by.id(this.testID.addButton));
    backButton = element(by.id(this.testID.backButton));
    usersList = element(by.id(this.testID.usersList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.channelAddMembersScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.channelAddMembersScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.channelAddMembersScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.channelAddMembersScreenPrefix);

    getUser = (userId, diplayUsername) => {
        const userItemTestID = `${this.testID.userItem}.${userId}`;
        const baseMatcher = by.id(userItemTestID);
        const userItemMatcher = diplayUsername ? baseMatcher.withDescendant(by.text(diplayUsername)) : baseMatcher;
        const userItemDisplayUsernameMatcher = by.id(this.testID.userItemDisplayUsername).withAncestor(userItemMatcher);

        return {
            userItem: element(userItemMatcher),
            userItemDisplayUsername: element(userItemDisplayUsernameMatcher),
        };
    };

    getUserAtIndex = (index) => {
        return element(by.id(this.testID.userItem).withAncestor(by.id(this.testID.usersList))).atIndex(index);
    };

    getUserByDisplayUsername = (displayUsername) => {
        return element(by.text(displayUsername).withAncestor(by.id(this.testID.usersList)));
    };

    getDisplayUsernameAtIndex = (index) => {
        return element(by.id(this.testID.userItemDisplayUsername)).atIndex(index);
    };

    toBeVisible = async () => {
        await expect(this.channelAddMembersScreen).toBeVisible();

        return this.channelAddMembersScreen;
    };

    open = async () => {
        // # Open more direct messages screen
        await MainSidebar.openChannelMembersButton.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.channelAddMembersScreen).not.toBeVisible();
    };

    hasUserDisplayUsernameAtIndex = async (index, displayUsername) => {
        await expect(
            this.getDisplayUsernameAtIndex(index),
        ).toHaveText(displayUsername);
    };
}

const channelAddMembersScreen = new ChannelAddMembersScreen();
export default channelAddMembersScreen;
