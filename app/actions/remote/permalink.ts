// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeepLink} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentTeam} from '@queries/servers/team';
import {displayPermalink} from '@utils/permalink';

import type TeamModel from '@typings/database/models/servers/team';

export const showPermalink = async (serverUrl: string, teamName: string, postId: string, openAsPermalink = true) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        let name = teamName;
        let team: TeamModel | undefined;
        if (!name || name === DeepLink.Redirect) {
            team = await getCurrentTeam(database);
            if (team) {
                name = team.name;
            }
        }

        await displayPermalink(name, postId, openAsPermalink);

        return {};
    } catch (error) {
        return {error};
    }
};
