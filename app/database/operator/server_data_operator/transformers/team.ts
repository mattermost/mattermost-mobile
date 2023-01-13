// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const {
    MY_TEAM,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

/**
 * transformTeamMembershipRecord: Prepares a record of the SERVER database 'TeamMembership' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<TeamMembershipModel>}
 */
export const transformTeamMembershipRecord = ({action, database, value}: TransformerArgs): Promise<TeamMembershipModel> => {
    const raw = value.raw as TeamMembership;
    const record = value.record as TeamMembershipModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (teamMembership: TeamMembershipModel) => {
        teamMembership._raw.id = isCreateAction ? (raw?.id ?? teamMembership.id) : record.id;
        teamMembership.teamId = raw.team_id;
        teamMembership.userId = raw.user_id;
        teamMembership.schemeAdmin = raw.scheme_admin;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_MEMBERSHIP,
        value,
        fieldsMapper,
    }) as Promise<TeamMembershipModel>;
};

/**
 * transformTeamRecord: Prepares a record of the SERVER database 'Team' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<TeamModel>}
 */
export const transformTeamRecord = ({action, database, value}: TransformerArgs): Promise<TeamModel> => {
    const raw = value.raw as Team;
    const record = value.record as TeamModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (team: TeamModel) => {
        team._raw.id = isCreateAction ? (raw?.id ?? team.id) : record.id;
        team.isAllowOpenInvite = raw.allow_open_invite;
        team.description = raw.description;
        team.displayName = raw.display_name;
        team.name = raw.name;
        team.updateAt = raw.update_at;
        team.type = raw.type;
        team.allowedDomains = raw.allowed_domains;
        team.isGroupConstrained = Boolean(raw.group_constrained);
        team.lastTeamIconUpdatedAt = raw.last_team_icon_update;
        team.inviteId = raw.invite_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM,
        value,
        fieldsMapper,
    }) as Promise<TeamModel>;
};

/**
 * transformTeamChannelHistoryRecord: Prepares a record of the SERVER database 'TeamChannelHistory' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<TeamChannelHistoryModel>}
 */
export const transformTeamChannelHistoryRecord = ({action, database, value}: TransformerArgs): Promise<TeamChannelHistoryModel> => {
    const raw = value.raw as TeamChannelHistory;
    const record = value.record as TeamChannelHistoryModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (teamChannelHistory: TeamChannelHistoryModel) => {
        teamChannelHistory._raw.id = isCreateAction ? (raw.id || teamChannelHistory.id) : record.id;
        teamChannelHistory.channelIds = raw.channel_ids;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_CHANNEL_HISTORY,
        value,
        fieldsMapper,
    }) as Promise<TeamChannelHistoryModel>;
};

/**
 * transformTeamSearchHistoryRecord: Prepares a record of the SERVER database 'TeamSearchHistory' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<TeamSearchHistoryModel>}
 */
export const transformTeamSearchHistoryRecord = ({action, database, value}: TransformerArgs): Promise<TeamSearchHistoryModel> => {
    const raw = value.raw as TeamSearchHistory;
    const record = value.record as TeamSearchHistoryModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (teamSearchHistory: TeamSearchHistoryModel) => {
        teamSearchHistory._raw.id = isCreateAction ? (teamSearchHistory.id) : record.id;
        teamSearchHistory.createdAt = raw.created_at;
        teamSearchHistory.displayTerm = raw.display_term;
        teamSearchHistory.term = raw.term;
        teamSearchHistory.teamId = raw.team_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_SEARCH_HISTORY,
        value,
        fieldsMapper,
    }) as Promise<TeamSearchHistoryModel>;
};

/**
 * transformMyTeamRecord: Prepares a record of the SERVER database 'MyTeam' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<MyTeamModel>}
 */
export const transformMyTeamRecord = ({action, database, value}: TransformerArgs): Promise<MyTeamModel> => {
    const raw = value.raw as MyTeam;
    const record = value.record as MyTeamModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myTeam: MyTeamModel) => {
        myTeam._raw.id = isCreateAction ? (raw.id || myTeam.id) : record.id;
        myTeam.roles = raw.roles;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_TEAM,
        value,
        fieldsMapper,
    }) as Promise<MyTeamModel>;
};
