// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';

import type {IntlShape} from 'react-intl';

import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryTeamById, queryTeamByName} from '@queries/servers/team';
import {dismissAllModals, showModalOverCurrentContext} from '@screens/navigation';
import {permalinkBadTeam} from '@utils/draft';
import {changeOpacity} from '@utils/theme';
import {PERMALINK_GENERIC_TEAM_NAME_REDIRECT} from '@utils/url';

import type TeamModel from '@typings/database/models/servers/team';

let showingPermalink = false;

export const showPermalink = async (serverUrl: string, teamName: string, postId: string, intl: IntlShape, openAsPermalink = true) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        let name = teamName;
        let team: TeamModel | undefined;
        const system = await queryCommonSystemValues(database);
        if (!name || name === PERMALINK_GENERIC_TEAM_NAME_REDIRECT) {
            team = await queryTeamById(database, system.currentTeamId);
            if (team) {
                name = team.name;
            }
        }

        if (!team) {
            team = await queryTeamByName(database, name);
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

        Keyboard.dismiss();
        if (showingPermalink) {
            await dismissAllModals();
        }

        const screen = 'Permalink';
        const passProps = {
            isPermalink: openAsPermalink,
            teamName,
            postId,
        };

        const options = {
            layout: {
                componentBackgroundColor: changeOpacity('#000', 0.2),
            },
        };

        showingPermalink = true;
        showModalOverCurrentContext(screen, passProps, options);

        return {error: undefined};
    } catch (error) {
        return {error};
    }
};

export const closePermalink = () => {
    showingPermalink = false;
};
