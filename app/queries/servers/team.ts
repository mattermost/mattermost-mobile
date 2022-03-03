// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query} from '@nozbe/watermelondb';

import {Database as DatabaseConstants, Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';

import {prepareDeleteChannel, queryDefaultChannelForTeam} from './channel';
import {queryPreferencesByCategoryAndName} from './preference';
import {patchTeamHistory, queryConfig, queryTeamHistory} from './system';
import {queryCurrentUser} from './user';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';

const {MY_TEAM, TEAM, TEAM_CHANNEL_HISTORY, MY_CHANNEL} = DatabaseConstants.MM_TABLES.SERVER;

export const addChannelToTeamHistory = async (operator: ServerDataOperator, teamId: string, channelId: string, prepareRecordsOnly = false) => {
    let tch: TeamChannelHistory|undefined;

    try {
        const myChannel = (await operator.database.get(MY_CHANNEL).find(channelId));
        if (!myChannel) {
            return [];
        }
        const teamChannelHistory = (await operator.database.get(TEAM_CHANNEL_HISTORY).find(teamId)) as TeamChannelHistoryModel;
        const channelIdSet = new Set(teamChannelHistory.channelIds);
        if (channelIdSet.has(channelId)) {
            channelIdSet.delete(channelId);
        }

        const channelIds = Array.from(channelIdSet);
        channelIds.unshift(channelId);
        tch = {
            id: teamId,
            channel_ids: channelIds.slice(0, 5),
        };
    } catch {
        tch = {
            id: teamId,
            channel_ids: [channelId],
        };
    }

    return operator.handleTeamChannelHistory({teamChannelHistories: [tch], prepareRecordsOnly});
};

export const queryNthLastChannelFromTeam = async (database: Database, teamId: string, n = 0) => {
    const teamChannelHistory = await queryChannelHistory(database, teamId);
    if (teamChannelHistory && teamChannelHistory.length > n + 1) {
        return teamChannelHistory[n];
    }

    // No channel history for the team
    const channel = await queryDefaultChannelForTeam(database, teamId);
    return channel?.id || '';
};

export const queryChannelHistory = async (database: Database, teamId: string) => {
    try {
        const teamChannelHistory = await database.get<TeamChannelHistoryModel>(TEAM_CHANNEL_HISTORY).find(teamId);
        return teamChannelHistory.channelIds;
    } catch {
        return [];
    }
};

export const removeChannelFromTeamHistory = async (operator: ServerDataOperator, teamId: string, channelId: string, prepareRecordsOnly = false) => {
    let tch: TeamChannelHistory;

    try {
        const teamChannelHistory = (await operator.database.get(TEAM_CHANNEL_HISTORY).find(teamId)) as TeamChannelHistoryModel;
        const channelIdSet = new Set(teamChannelHistory.channelIds);
        if (channelIdSet.has(channelId)) {
            channelIdSet.delete(channelId);
        } else {
            return [];
        }

        const channelIds = Array.from(channelIdSet);
        tch = {
            id: teamId,
            channel_ids: channelIds,
        };
    } catch {
        return [];
    }

    return operator.handleTeamChannelHistory({teamChannelHistories: [tch], prepareRecordsOnly});
};

export const addTeamToTeamHistory = async (operator: ServerDataOperator, teamId: string, prepareRecordsOnly = false) => {
    const teamHistory = (await queryTeamHistory(operator.database));
    const teamHistorySet = new Set(teamHistory);
    if (teamHistorySet.has(teamId)) {
        teamHistorySet.delete(teamId);
    }

    const teamIds = Array.from(teamHistorySet);
    teamIds.unshift(teamId);
    return patchTeamHistory(operator, teamIds, prepareRecordsOnly);
};

export const removeTeamFromTeamHistory = async (operator: ServerDataOperator, teamId: string, prepareRecordsOnly = false) => {
    const teamHistory = (await queryTeamHistory(operator.database));
    const teamHistorySet = new Set(teamHistory);
    if (!teamHistorySet.has(teamId)) {
        return undefined;
    }

    teamHistorySet.delete(teamId);
    const teamIds = Array.from(teamHistorySet).slice(0, 5);

    return patchTeamHistory(operator, teamIds, prepareRecordsOnly);
};

export const queryLastTeam = async (database: Database) => {
    const teamHistory = (await queryTeamHistory(database));
    if (teamHistory.length > 0) {
        return teamHistory[0];
    }

    return queryDefaultTeam(database);
};

export const syncTeamTable = async (operator: ServerDataOperator, teams: Team[]) => {
    try {
        const deletedTeams = teams.filter((t) => t.delete_at > 0).map((t) => t.id);
        const availableTeams = teams.filter((a) => !deletedTeams.includes(a.id));
        const models = [];

        if (deletedTeams.length) {
            const notAvailable = await operator.database.get<TeamModel>(TEAM).query(Q.where('id', Q.oneOf(deletedTeams))).fetch();
            const deletions = await Promise.all(notAvailable.map((t) => prepareDeleteTeam(t)));
            for (const d of deletions) {
                models.push(...d);
            }
        }

        models.push(...await operator.handleTeam({teams: availableTeams, prepareRecordsOnly: true}));
        await operator.batchRecords(models);
        return {};
    } catch (error) {
        return {error};
    }
};

export const queryDefaultTeam = async (database: Database) => {
    const user = await queryCurrentUser(database);
    const config = await queryConfig(database);
    const teamOrderPreferences = await queryPreferencesByCategoryAndName(database, Preferences.TEAMS_ORDER, '');
    let teamOrderPreference = '';
    if (teamOrderPreferences.length) {
        teamOrderPreference = teamOrderPreferences[0].value;
    }

    const teamModels = await database.get<TeamModel>(TEAM).query(Q.on(MY_TEAM, Q.where('id', Q.notEq('')))).fetch();
    const teams = teamModels.map((t) => ({id: t.id, display_name: t.displayName, name: t.name} as Team));

    const defaultTeam = selectDefaultTeam(teams, user?.locale || DEFAULT_LOCALE, teamOrderPreference, config.ExperimentalPrimaryTeam);
    return defaultTeam?.id;
};

export const prepareMyTeams = (operator: ServerDataOperator, teams: Team[], memberships: TeamMembership[]) => {
    try {
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams});
        const teamMemberships = memberships.filter((m) => teams.find((t) => t.id === m.team_id) && m.delete_at === 0);
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships});
        const myTeams: MyTeam[] = teamMemberships.map((tm) => {
            return {id: tm.team_id, roles: tm.roles ?? ''};
        });
        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
        });

        return [teamRecords, teamMembershipRecords, myTeamRecords];
    } catch {
        return undefined;
    }
};

export const deleteMyTeams = async (operator: ServerDataOperator, teams: TeamModel[]) => {
    try {
        const preparedModels: Model[] = [];
        for await (const team of teams) {
            try {
                const myTeam = await team.myTeam.fetch() as MyTeamModel;
                preparedModels.push(myTeam.prepareDestroyPermanently());
            } catch {
                // Record not found, do nothing
            }
        }

        if (preparedModels.length) {
            await operator.batchRecords(preparedModels);
        }
        return {};
    } catch (error) {
        return {error};
    }
};

export const prepareDeleteTeam = async (team: TeamModel): Promise<Model[]> => {
    try {
        const preparedModels: Model[] = [team.prepareDestroyPermanently()];

        try {
            const model = await team.myTeam.fetch();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
            }
        } catch {
            // Record not found, do nothing
        }

        try {
            const model = await team.teamChannelHistory.fetch();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
            }
        } catch {
            // Record not found, do nothing
        }

        const associatedChildren: Array<Query<any>> = [
            team.members,
            team.slashCommands,
            team.teamSearchHistories,
        ];
        for await (const children of associatedChildren) {
            try {
                const models = await children.fetch() as Model[];
                models.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
            } catch {
                // Record not found, do nothing
            }
        }

        const channels = await team.channels.fetch() as ChannelModel[];
        for await (const channel of channels) {
            try {
                const preparedChannel = await prepareDeleteChannel(channel);
                preparedModels.push(...preparedChannel);
            } catch {
                // Record not found, do nothing
            }
        }

        return preparedModels;
    } catch (error) {
        return [];
    }
};

export const queryMyTeamById = async (database: Database, teamId: string): Promise<MyTeamModel|undefined> => {
    try {
        const myTeam = (await database.get(MY_TEAM).find(teamId)) as MyTeamModel;
        return myTeam;
    } catch (err) {
        return undefined;
    }
};

export const queryTeamById = async (database: Database, teamId: string): Promise<TeamModel|undefined> => {
    try {
        const team = (await database.get(TEAM).find(teamId)) as TeamModel;
        return team;
    } catch {
        return undefined;
    }
};

export const queryTeamsById = async (database: Database, teamIds: string[]): Promise<TeamModel[]|undefined> => {
    try {
        const teams = (await database.get(TEAM).query(Q.where('id', Q.oneOf(teamIds))).fetch()) as TeamModel[];
        return teams;
    } catch {
        return undefined;
    }
};

export const queryTeamByName = async (database: Database, teamName: string): Promise<TeamModel|undefined> => {
    try {
        const team = (await database.get(TEAM).query(Q.where('name', teamName)).fetch()) as TeamModel[];
        if (team.length) {
            return team[0];
        }

        return undefined;
    } catch {
        return undefined;
    }
};

export const queryMyTeams = async (database: Database): Promise<MyTeamModel[]|undefined> => {
    try {
        const teams = (await database.get(MY_TEAM).query().fetch()) as MyTeamModel[];
        return teams;
    } catch {
        return undefined;
    }
};

export const queryAvailableTeamIds = async (database: Database, excludeTeamId: string, teams?: Team[], preferences?: PreferenceType[], locale?: string): Promise<string[]> => {
    let availableTeamIds: string[] = [];

    if (teams) {
        let teamOrderPreference;
        if (preferences) {
            teamOrderPreference = getPreferenceValue(preferences, Preferences.TEAMS_ORDER, '', '') as string;
        } else {
            const dbPreferences = await queryPreferencesByCategoryAndName(database, Preferences.TEAMS_ORDER, '');
            teamOrderPreference = dbPreferences[0].value;
        }

        const userLocale = locale || (await queryCurrentUser(database))?.locale;
        const config = await queryConfig(database);
        const defaultTeam = selectDefaultTeam(teams, userLocale, teamOrderPreference, config.ExperimentalPrimaryTeam);

        availableTeamIds = [defaultTeam!.id];
    } else {
        const dbTeams = await queryMyTeams(database);
        if (dbTeams) {
            availableTeamIds = dbTeams.map((team) => team.id);
        }
    }

    return availableTeamIds.filter((id) => id !== excludeTeamId);
};
