// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class TeamsList {
    testID = {
        teamsList: 'main.sidebar.teams_list',
        teamItem: 'main.sidebar.teams_list.flat_list.teams_list_item',
        teamItemCurrent: 'main.sidebar.teams_list.flat_list.teams_list_item.current',
        teamItemDisplayName: 'main.sidebar.teams_list.flat_list.teams_list_item.display_name',
        teamItemIcon: 'main.sidebar.teams_list.flat_list.teams_list_item.team_icon',
    }

    teamsList = element(by.id(this.testID.teamsList));

    getTeamItem = (teamId, displayName) => {
        const teamItemTestID = `${this.testID.teamItem}.${teamId}`;
        const baseMatcher = by.id(teamItemTestID);
        const teamItemMatcher = displayName ? baseMatcher.withDescendant(by.text(displayName)) : baseMatcher;
        const teamItemCurrentMatcher = by.id(this.testID.teamItemCurrent).withAncestor(teamItemMatcher);
        const teamItemDisplayNameMatcher = by.id(this.testID.teamItemDisplayName).withAncestor(teamItemMatcher);
        const teamItemIconMatcher = by.id(this.testID.teamItemIcon).withAncestor(teamItemMatcher);

        return {
            teamItem: element(teamItemMatcher),
            teamItemCurrent: element(teamItemCurrentMatcher),
            teamItemDisplayName: element(teamItemDisplayNameMatcher),
            teamItemIcon: element(teamItemIconMatcher),
        };
    }

    getTeamByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.teamsList)));
    }

    getTeamDisplayNameAtIndex = (index) => {
        return element(by.id(this.testID.teamItemDisplayName)).atIndex(index);
    }
}

const teamsList = new TeamsList();
export default teamsList;
