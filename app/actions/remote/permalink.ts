// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {getCommonSystemValues} from '@queries/servers/system';
import {getTeamById, getTeamByName} from '@queries/servers/team';
import {permalinkBadTeam} from '@utils/draft';
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
        const system = await getCommonSystemValues(database);
        if (!name || name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            team = await getTeamById(database, system.currentTeamId);
            if (team) {
                name = team.name;
            }
        }

        if (!team) {
            team = await getTeamByName(database, name);
            if (!team) {
                permalinkBadTeam(intl);
                return {error: 'Bad Permalink team'};
            }
        }

        if (team.id !== system.currentTeamId) {
            const result = await fetchMyChannelsForTeam(serverUrl, team.id, true, 0, false, true);
            if (result.error) {
                return {error: result.error};
            }
        }

        await displayPermalink(team.name, postId, openAsPermalink);

        return {error: undefined};
    } catch (error) {
        return {error};
    }
};
