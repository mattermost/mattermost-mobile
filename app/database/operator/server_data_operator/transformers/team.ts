// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import type {
    TransformerArgs,
    RawMyTeam,
    RawSlashCommand,
    RawTeam,
    RawTeamChannelHistory,
    RawTeamMembership,
    RawTeamSearchHistory,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import MyTeam from '@typings/database/models/servers/my_team';
import SlashCommand from '@typings/database/models/servers/slash_command';
import Team from '@typings/database/models/servers/team';
import TeamChannelHistory from '@typings/database/models/servers/team_channel_history';
import TeamMembership from '@typings/database/models/servers/team_membership';
import TeamSearchHistory from '@typings/database/models/servers/team_search_history';

const {
    MY_TEAM,
    SLASH_COMMAND,
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
 * @returns {Promise<Model>}
 */
export const transformTeamMembershipRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawTeamMembership;
    const record = value.record as TeamMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (teamMembership: TeamMembership) => {
        teamMembership._raw.id = isCreateAction ? (raw?.id ?? teamMembership.id) : record.id;
        teamMembership.teamId = raw.team_id;
        teamMembership.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_MEMBERSHIP,
        value,
        fieldsMapper,
    });
};

/**
 * transformTeamRecord: Prepares a record of the SERVER database 'Team' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformTeamRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawTeam;
    const record = value.record as Team;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (team: Team) => {
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
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM,
        value,
        fieldsMapper,
    });
};

/**
 * transformTeamChannelHistoryRecord: Prepares a record of the SERVER database 'TeamChannelHistory' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformTeamChannelHistoryRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawTeamChannelHistory;
    const record = value.record as TeamChannelHistory;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (teamChannelHistory: TeamChannelHistory) => {
        teamChannelHistory._raw.id = isCreateAction ? (teamChannelHistory.id) : record.id;
        teamChannelHistory.teamId = raw.team_id;
        teamChannelHistory.channelIds = raw.channel_ids;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_CHANNEL_HISTORY,
        value,
        fieldsMapper,
    });
};

/**
 * transformTeamSearchHistoryRecord: Prepares a record of the SERVER database 'TeamSearchHistory' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformTeamSearchHistoryRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawTeamSearchHistory;
    const record = value.record as TeamSearchHistory;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (teamSearchHistory: TeamSearchHistory) => {
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
    });
};

/**
 * transformSlashCommandRecord: Prepares a record of the SERVER database 'SlashCommand' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformSlashCommandRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawSlashCommand;
    const record = value.record as SlashCommand;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (slashCommand: SlashCommand) => {
        slashCommand._raw.id = isCreateAction ? (raw?.id ?? slashCommand.id) : record.id;
        slashCommand.isAutoComplete = raw.auto_complete;
        slashCommand.description = raw.description;
        slashCommand.displayName = raw.display_name;
        slashCommand.hint = raw.auto_complete_hint;
        slashCommand.method = raw.method;
        slashCommand.teamId = raw.team_id;
        slashCommand.token = raw.token;
        slashCommand.trigger = raw.trigger;
        slashCommand.updateAt = raw.update_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SLASH_COMMAND,
        value,
        fieldsMapper,
    });
};

/**
 * transformMyTeamRecord: Prepares a record of the SERVER database 'MyTeam' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformMyTeamRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawMyTeam;
    const record = value.record as MyTeam;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myTeam: MyTeam) => {
        myTeam._raw.id = isCreateAction ? myTeam.id : record.id;
        myTeam.teamId = raw.team_id;
        myTeam.roles = raw.roles;
        myTeam.isUnread = raw.is_unread;
        myTeam.mentionsCount = raw.mentions_count;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_TEAM,
        value,
        fieldsMapper,
    });
};
