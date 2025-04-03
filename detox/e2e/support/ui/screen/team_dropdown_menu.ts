// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchMessagesScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class TeamDropdownMenuScreen {
    testID = {
        teamDropdownMenuScreen: 'search.select_team_slide_up.screen',
    };

    teamDropdownMenuScreen = element(by.id(this.testID.teamDropdownMenuScreen));

    getTeamIcon = (teamId: string) => {
        return element(by.id(`team_sidebar.team_list.team_list_item.${teamId}.team_display_name`));
    };

    getTeamDisplayName = (teamId: string) => {
        return element(by.id(`team_sidebar.team_list.team_list_item.${teamId}.team_display_name`));
    };

    toBeVisible = async () => {
        await waitFor(this.teamDropdownMenuScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.teamDropdownMenuScreen;
    };

    open = async () => {
        // # Open team dropdown menu screen
        await SearchMessagesScreen.teamPickerButton.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.teamDropdownMenuScreen.tap({x: 5, y: 10});
        await expect(this.teamDropdownMenuScreen).not.toBeVisible();
    };
}

const teamDropdownMenuScreen = new TeamDropdownMenuScreen();
export default teamDropdownMenuScreen;
