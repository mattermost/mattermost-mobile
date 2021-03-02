// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import SearchBar from './search_bar';

class ChannelsList {
    testID = {
        channelsListPrefix: 'main.sidebar.channels_list.',
        channelsList: 'main.sidebar.channels_list.list',
        channelItem: 'main.sidebar.channels_list.list.channel_item',
        channelItemDisplayName: 'main.sidebar.channels_list.list.channel_item.display_name',
        filteredChannelsList: 'main.sidebar.channels_list.filtered_list',
        filteredChannelItem: 'main.sidebar.channels_list.filtered_list.channel_item',
        filteredChannelItemDisplayName: 'main.sidebar.channels_list.filtered_list.channel_item.display_name',
        switchTeamsButton: 'main.sidebar.channels_list.switch_teams.button',
        switchTeamsButtonBadge: 'main.sidebar.channels_list.switch_teams.button.badge',
        switchTeamsButtonBadgeUnreadCount: 'main.sidebar.channels_list.switch_teams.button.badge.unread_count',
        switchTeamsButtonBadgeUnreadIndicator: 'main.sidebar.channels_list.switch_teams.button.badge.unread_indicator',
    }

    channelsList = element(by.id(this.testID.channelsList));
    filteredChannelsList = element(by.id(this.testID.channelsList));
    switchTeamsButton = element(by.id(this.testID.switchTeamsButton));
    switchTeamsButtonBadge = element(by.id(this.testID.switchTeamsButtonBadge));
    switchTeamsButtonBadgeUnreadCount = element(by.id(this.testID.switchTeamsButtonBadgeUnreadCount));
    switchTeamsButtonBadgeUnreadIndicator = element(by.id(this.testID.switchTeamsButtonBadgeUnreadIndicator));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.channelsListPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.channelsListPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.channelsListPrefix);
    clearButton = SearchBar.getClearButton(this.testID.channelsListPrefix);

    getChannelItem = (channelId, displayName) => {
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

    getFilteredChannelItem = (channelId, displayName) => {
        const filteredChannelItemTestID = `${this.testID.filteredChannelItem}.${channelId}`;
        const baseMatcher = by.id(filteredChannelItemTestID);
        const filteredChannelItemMatcher = displayName ? baseMatcher.withDescendant(by.text(displayName)) : baseMatcher;
        const filteredChannelItemDisplayNameMatcher = by.id(this.testID.filteredChannelItemDisplayName).withAncestor(filteredChannelItemMatcher);

        return {
            channelItem: element(filteredChannelItemMatcher),
            channelItemDisplayName: element(filteredChannelItemDisplayNameMatcher),
        };
    }

    getFilteredChannelByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.filteredChannelsList)));
    }

    getFilteredChannelDisplayNameAtIndex = (index) => {
        return element(by.id(this.testID.filteredChannelItemDisplayName)).atIndex(index);
    }
}

const channelsList = new ChannelsList();
export default channelsList;
