// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import {
    Alert,
    MainSidebar,
    SearchBar,
} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';

class ChannelMembersScreen {
    testID = {
        channelMembersScreenPrefix: 'channel_members.',
        channelMembersScreen: 'channel_members.screen',
        removeButton: 'channel_members.remove.button',
        backButton: 'screen.back.button',
        usersList: 'channel_members.custom_list',
        userItem: 'channel_members.custom_list.user_item',
        userItemDisplayUsername: 'channel_members.custom_list.user_item.display_username',
    };

    channelMembersScreen = element(by.id(this.testID.channelMembersScreen));
    removeButton = element(by.id(this.testID.removeButton));
    backButton = element(by.id(this.testID.backButton));
    usersList = element(by.id(this.testID.usersList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.channelMembersScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.channelMembersScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.channelMembersScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.channelMembersScreenPrefix);

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
        await expect(this.channelMembersScreen).toBeVisible();

        return this.channelMembersScreen;
    };

    open = async () => {
        // # Open more direct messages screen
        await MainSidebar.openChannelMembersButton.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.channelMembersScreen).not.toBeVisible();
    };

    removeMembers = async (displayUsernameList, {confirm = true} = {}) => {
        displayUsernameList.forEach(async (displayUsername) => {
            await this.getUserByDisplayUsername(`@${displayUsername}`).tap();
        });
        await wait(timeouts.ONE_SEC);
        await this.removeButton.tap();
        const {
            removeMembersTitle,
            noButton,
            yesButton,
        } = Alert;
        await expect(removeMembersTitle).toBeVisible();
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelMembersScreen).not.toBeVisible();
        } else {
            noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelMembersScreen).toBeVisible();
        }
    };

    hasUserDisplayUsernameAtIndex = async (index, displayUsername) => {
        await expect(
            this.getDisplayUsernameAtIndex(index),
        ).toHaveText(displayUsername);
    };
}

const channelMembersScreen = new ChannelMembersScreen();
export default channelMembersScreen;
