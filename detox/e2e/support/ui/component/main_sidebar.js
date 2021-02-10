// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ChannelsList from './channels_list';
import TeamsList from './teams_list';

class MainSidebar {
    testID = {
        mainSidebar: 'main.sidebar',
        openMoreChannelsButton: 'action_button_sidebar.channels',
        openCreatePrivateChannelButton: 'action_button_sidebar.pg',
        openMoreDirectMessagesButton: 'action_button_sidebar.direct',
    }

    mainSidebar = element(by.id(this.testID.mainSidebar));
    openMoreChannelsButton = element(by.id(this.testID.openMoreChannelsButton));
    openCreatePrivateChannelButton = element(by.id(this.testID.openCreatePrivateChannelButton));
    openMoreDirectMessagesButton = element(by.id(this.testID.openMoreDirectMessagesButton));

    // convenience props
    searchBar = ChannelsList.searchBar;
    searchInput = ChannelsList.searchInput;
    cancelButton = ChannelsList.cancelButton;
    clearButton = ChannelsList.clearButton;
    channelsList = ChannelsList.channelsList;
    filteredChannelsList = ChannelsList.filteredChannelsList;
    switchTeamsButton = ChannelsList.switchTeamsButton;
    switchTeamsButtonBadge = ChannelsList.switchTeamsButtonBadge;
    switchTeamsButtonBadgeUnreadCount = ChannelsList.switchTeamsButtonBadgeUnreadCount;
    switchTeamsButtonBadgeUnreadIndicator = ChannelsList.switchTeamsButtonBadgeUnreadIndicator;
    teamsList = TeamsList.teamsList;

    getChannel = (channelId, displayName) => {
        return ChannelsList.getChannelItem(channelId, displayName);
    }

    getChannelByDisplayName = (displayName) => {
        return ChannelsList.getChannelByDisplayName(displayName);
    }

    getChannelDisplayNameAtIndex = (index) => {
        return ChannelsList.getChannelDisplayNameAtIndex(index);
    }

    getFilteredChannel = (channelId, displayName) => {
        return ChannelsList.getFilteredChannelItem(channelId, displayName);
    }

    getFilteredChannelByDisplayName = (displayName) => {
        return ChannelsList.getFilteredChannelByDisplayName(displayName);
    }

    getFilteredChannelDisplayNameAtIndex = (index) => {
        return ChannelsList.getFilteredChannelDisplayNameAtIndex(index);
    }

    getTeam = (teamId, displayName) => {
        return TeamsList.getTeamItem(teamId, displayName);
    }

    getTeamByDisplayName = (displayName) => {
        return TeamsList.getTeamByDisplayName(displayName);
    }

    getTeamBadgeUnreadCountAtIndex = (index) => {
        return TeamsList.getTeamBadgeUnreadCountAtIndex(index);
    }

    getTeamDisplayNameAtIndex = (index) => {
        return TeamsList.getTeamDisplayNameAtIndex(index);
    }

    getTeamIconContentAtIndex = (index) => {
        return TeamsList.getTeamIconContentAtIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.mainSidebar).toBeVisible();

        return this.mainSidebar;
    }

    closeTeamSidebar = async () => {
        // # Close team sidebar
        await this.swipeLeft();
        await expect(this.teamsList).not.toBeVisible();
        await expect(this.channelsList).toBeVisible();
        await this.toBeVisible();
    }

    openTeamSidebar = async () => {
        // # Open team sidebar
        await this.switchTeamsButton.tap();
        await expect(this.channelsList).not.toBeVisible();
        await expect(this.teamsList).toBeVisible();
        await this.toBeVisible();
    }

    swipeLeft = async () => {
        await this.mainSidebar.swipe('left');
    }

    swipeRight = async () => {
        await this.mainSidebar.swipe('right');
    }

    hasChannelDisplayNameAtIndex = async (index, channelDisplayName) => {
        await expect(
            this.getChannelDisplayNameAtIndex(index),
        ).toHaveText(channelDisplayName);
    }

    hasFilteredChannelDisplayNameAtIndex = async (index, channelDisplayName) => {
        await expect(
            this.getFilteredChannelDisplayNameAtIndex(index),
        ).toHaveText(channelDisplayName);
    }

    hasTeamBadgeUnreadCountAtIndex = async (index, teamBadUnreadCount) => {
        await expect(
            this.getTeamBadgeUnreadCountAtIndex(index),
        ).toHaveText(teamBadUnreadCount);
    }

    hasTeamDisplayNameAtIndex = async (index, teamDisplayName) => {
        await expect(
            this.getTeamDisplayNameAtIndex(index),
        ).toHaveText(teamDisplayName);
    }

    hasTeamIconContentAtIndex = async (index, teamIconContent) => {
        await expect(
            this.getTeamIconContentAtIndex(index),
        ).toHaveText(teamIconContent);
    }
}

const mainSidebar = new MainSidebar();
export default mainSidebar;
