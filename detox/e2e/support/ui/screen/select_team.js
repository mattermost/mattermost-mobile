// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SelectTeamScreen {
    testID = {
        selectTeamScreen: 'select_team.screen',
        noTeams: 'select_team.no_teams',
        teamsList: 'select_team.custom_list',
        teamItem: 'select_team.custom_list.team_item',
        teamItemDisplayName: 'select_team.custom_list.team_item.display_name',
        teamItemIcon: 'select_team.custom_list.team_item.team_icon',
        teamItemIconContent: 'select_team.custom_list.team_item.team_icon.content',
    }

    selectTeamScreen = element(by.id(this.testID.selectTeamScreen));
    noTeams = element(by.id(this.testID.noTeams));
    teamsList = element(by.id(this.testID.teamsList));

    toBeVisible = async () => {
        await expect(this.selectTeamScreen).toBeVisible();

        return this.selectTeamScreen;
    }

    getTeamItem = (teamId, displayName) => {
        const teamItemTestID = `${this.testID.teamItem}.${teamId}`;
        const baseMatcher = by.id(teamItemTestID);
        const teamItemMatcher = displayName ? baseMatcher.withDescendant(by.text(displayName)) : baseMatcher;
        const teamItemDisplayNameMatcher = by.id(this.testID.teamItemDisplayName).withAncestor(teamItemMatcher);
        const teamItemIconMatcher = by.id(this.testID.teamItemIcon).withAncestor(teamItemMatcher);
        const teamItemIconContentMatcher = by.id(this.testID.teamItemIconContent).withAncestor(teamItemMatcher);

        return {
            teamItem: element(teamItemMatcher),
            teamItemDisplayName: element(teamItemDisplayNameMatcher),
            teamItemIcon: element(teamItemIconMatcher),
            teamItemIconContent: element(teamItemIconContentMatcher),
        };
    }

    getTeamByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.teamsList)));
    }

    getTeamDisplayNameAtIndex = (index) => {
        return element(by.id(this.testID.teamItemDisplayName)).atIndex(index);
    }

    getTeamIconContentAtIndex = (index) => {
        return element(by.id(this.testID.teamItemIconContent)).atIndex(index);
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

const selectTeamScreen = new SelectTeamScreen();
export default selectTeamScreen;
