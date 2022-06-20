// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getCurrentTeam} from '@queries/servers/team';
import {displayPermalink} from '@utils/permalink';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';

import type TeamModel from '@typings/database/models/servers/team';
import type {IntlShape} from 'react-intl';

export const showPermalink = async (serverUrl: string, teamName: string, postId: string, intl: IntlShape, openAsPermalink = true) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        let name = teamName;
        let team: TeamModel | undefined;
        if (!name || name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            team = await getCurrentTeam(database);
            if (team) {
                name = team.name;
            }
        }

        await displayPermalink(name, postId, openAsPermalink);

        return {error: undefined};
    } catch (error) {
        return {error};
    }
};
