// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class TeamsList {
    testID = {
        teamsList: 'main.sidebar.teams_list',
        teamItem: 'main.sidebar.teams_list.flat_list.teams_list_item',
        teamItemBadge: 'main.sidebar.teams_list.flat_list.teams_list_item.badge',
        teamItemBadgeUnreadCount: 'main.sidebar.teams_list.flat_list.teams_list_item.badge.unread_count',
        teamItemBadgeUnreadIndicator: 'main.sidebar.teams_list.flat_list.teams_list_item.badge.unread_indicator',
        teamItemCurrent: 'main.sidebar.teams_list.flat_list.teams_list_item.current',
        teamItemDisplayName: 'main.sidebar.teams_list.flat_list.teams_list_item.display_name',
        teamItemIcon: 'main.sidebar.teams_list.flat_list.teams_list_item.team_icon',
        teamItemIconContent: 'main.sidebar.teams_list.flat_list.teams_list_item.team_icon.content',
    }

    teamsList = element(by.id(this.testID.teamsList));

    getTeamItem = (teamId, displayName) => {
        const teamItemTestID = `${this.testID.teamItem}.${teamId}`;
        const baseMatcher = by.id(teamItemTestID);
        const teamItemMatcher = displayName ? baseMatcher.withDescendant(by.text(displayName)) : baseMatcher;
        const teamItemBadgeMatcher = by.id(this.testID.teamItemBadge).withAncestor(teamItemMatcher);
        const teamItemBadgeUnreadCountMatcher = by.id(this.testID.teamItemBadgeUnreadCount).withAncestor(teamItemMatcher);
        const teamItemBadgeUnreadIndicatorMatcher = by.id(this.testID.teamItemBadgeUnreadIndicator).withAncestor(teamItemMatcher);
        const teamItemCurrentMatcher = by.id(this.testID.teamItemCurrent).withAncestor(teamItemMatcher);
        const teamItemDisplayNameMatcher = by.id(this.testID.teamItemDisplayName).withAncestor(teamItemMatcher);
        const teamItemIconMatcher = by.id(this.testID.teamItemIcon).withAncestor(teamItemMatcher);
        const teamItemIconContentMatcher = by.id(this.testID.teamItemIconContent).withAncestor(teamItemMatcher);

        return {
            teamItem: element(teamItemMatcher),
            teamItemBadge: element(teamItemBadgeMatcher),
            teamItemBadgeUnreadCount: element(teamItemBadgeUnreadCountMatcher),
            teamItemBadgeUnreadIndicator: element(teamItemBadgeUnreadIndicatorMatcher),
            teamItemCurrent: element(teamItemCurrentMatcher),
            teamItemDisplayName: element(teamItemDisplayNameMatcher),
            teamItemIcon: element(teamItemIconMatcher),
            teamItemIconContent: element(teamItemIconContentMatcher),
        };
    }

    getTeamByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.teamsList)));
    }

    getTeamBadgeUnreadCountAtIndex = (index) => {
        return element(by.id(this.testID.teamItemBadgeUnreadCount)).atIndex(index);
    }

    getTeamDisplayNameAtIndex = (index) => {
        return element(by.id(this.testID.teamItemDisplayName)).atIndex(index);
    }

    getTeamIconContentAtIndex = (index) => {
        return element(by.id(this.testID.teamItemIconContent)).atIndex(index);
    }
}

const teamsList = new TeamsList();
export default teamsList;
