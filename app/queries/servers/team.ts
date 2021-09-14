// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {Database as DatabaseConstants} from '@constants';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';

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
