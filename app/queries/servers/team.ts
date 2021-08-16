// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';

import {Database as DatabaseConstants} from '@constants';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamModel from '@typings/database/models/servers/team';

import {prepareDeleteChannel} from './channel';

const {MY_TEAM, TEAM, TEAM_CHANNEL_HISTORY} = DatabaseConstants.MM_TABLES.SERVER;

export const addChannelToTeamHistory = async (operator: ServerDataOperator, teamId: string, channelId: string, prepareRecordsOnly = false) => {
    let tch: TeamChannelHistory|undefined;

    try {
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

export const prepareMyTeams = (operator: ServerDataOperator, teams: Team[], memberships: TeamMembership[], unreads: TeamUnread[]) => {
    try {
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams});
        const teamMemberships = memberships.filter((m) => teams.find((t) => t.id === m.team_id));
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships});
        const myTeams: MyTeam[] = unreads.map((unread) => {
            const matchingTeam = teamMemberships.find((team) => team.team_id === unread.team_id);
            return {id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
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
    const preparedModels: Model[] = [];
    for await (const team of teams) {
        const myTeam = await team.myTeam.fetch() as MyTeamModel;
        preparedModels.push(myTeam.prepareDestroyPermanently());
    }

    await operator.batchRecords(preparedModels);
};

export const prepareDeleteTeam = async (team: TeamModel): Promise<Model[]> => {
    const preparedModels: Model[] = [team.prepareDestroyPermanently()];

    const relations: Relation<Model>[] = [team.myTeam, team.teamChannelHistory];
    for await (const relation of relations) {
        try {
            const model = await relation.fetch();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
            }
        } catch {
            // Record not found, do nothing
        }
    }

    const associatedChildren: Query<any>[] = [
        team.members,
        team.groupsTeam,
        team.slashCommands,
        team.teamSearchHistories,
    ];
    for await (const children of associatedChildren) {
        const models = await children.fetch() as Model[];
        models.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }

    const channels = await team.channels.fetch() as ChannelModel[];
    for await (const channel of channels) {
        const preparedChannel = await prepareDeleteChannel(channel);
        preparedModels.push(...preparedChannel);
    }

    return preparedModels;
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
