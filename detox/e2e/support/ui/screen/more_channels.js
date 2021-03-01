// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    BottomSheet,
    MainSidebar,
    SearchBar,
} from '@support/ui/component';

class MoreChannelsScreen {
    testID = {
        moreChannelsScreen: 'more_channels.screen',
        moreChannelsScreenPrefix: 'more_channels.',
        closeMoreChannelsButton: 'close.more_channels.button',
        createButton: 'more_channels.create.button',
        channelDropdown: 'more_channels.channel.dropdown',
        channelDropdownArchived: 'more_channels.channel.dropdown.archived',
        channelDropdownPublic: 'more_channels.channel.dropdown.public',
        channelsList: 'more_channels.custom_list',
        channelItem: 'more_channels.custom_list.channel_item',
        channelItemDisplayName: 'more_channels.custom_list.channel_item.display_name',
    }

    moreChannelsScreen = element(by.id(this.testID.moreChannelsScreen));
    closeMoreChannelsButton = element(by.id(this.testID.closeMoreChannelsButton));
    createButton = element(by.id(this.testID.createButton));
    channelDropdown = element(by.id(this.testID.channelDropdown));
    channelDropdownArchived = element(by.id(this.testID.channelDropdownArchived));
    channelDropdownPublic = element(by.id(this.testID.channelDropdownPublic));
    channelsList = element(by.id(this.testID.channelsList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.moreChannelsScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.moreChannelsScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.moreChannelsScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.moreChannelsScreenPrefix);

    getChannel = (channelId, displayName) => {
        const channelItemTestID = `${this.testID.channelItem}.${channelId}`;
        const baseMatcher = by.id(channelItemTestID);
        const channelItemMatcher = displayName ? baseMatcher.withDescendant(by.text(displayName)) : baseMatcher;
        const channelItemDisplayNameMatcher = by.id(this.testID.channelItemDisplayName).withAncestor(channelItemMatcher);

        return {
            channelItem: element(channelItemMatcher),
            channelItemDisplayName: element(channelItemDisplayNameMatcher),
        };
    }

    getChannelByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.channelsList)));
    }

    getChannelDisplayNameAtIndex = (index) => {
        return element(by.id(this.testID.channelItemDisplayName)).atIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.moreChannelsScreen).toBeVisible();

        return this.moreChannelsScreen;
    }

    open = async () => {
        // # Open more channels screen
        await MainSidebar.openMoreChannelsButton.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.closeMoreChannelsButton.tap();
        await expect(this.moreChannelsScreen).not.toBeVisible();
    }

    showArchivedChannels = async () => {
        await this.channelDropdown.tap();
        await BottomSheet.archivedChannelsOption.tap();
        await expect(this.channelDropdownArchived).toBeVisible();
    }

    showPublicChannels = async () => {
        await this.channelDropdown.tap();
        await BottomSheet.publicChannelsOption.tap();
        await expect(this.channelDropdownPublic).toBeVisible();
    }

    hasChannelDisplayNameAtIndex = async (index, channelDisplayName) => {
        await expect(
            this.getChannelDisplayNameAtIndex(index),
        ).toHaveText(channelDisplayName);
    }
}

const moreChannelsScreen = new MoreChannelsScreen();
export default moreChannelsScreen;
