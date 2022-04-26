// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class TeamSidebar {
    testID = {
        teamFlatList: 'team_sidebar.team_list.flat_list',
        addTeamButton: 'team_sidebar.add_team.button',
    };

    teamFlatList = element(by.id(this.testID.teamFlatList));
    addTeamButton = element(by.id(this.testID.addTeamButton));
}

const teamSidebar = new TeamSidebar();
export default teamSidebar;
