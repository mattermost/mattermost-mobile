// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {MM_TABLES} from '@constants/database';

// See LICENSE.txt for license information.
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import {
    DataFactoryArgs,
    RawMyTeam,
    RawSlashCommand,
    RawTeam,
    RawTeamChannelHistory,
    RawTeamMembership,
    RawTeamSearchHistory,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import MyTeam from '@typings/database/my_team';
import SlashCommand from '@typings/database/slash_command';
import Team from '@typings/database/team';
import TeamChannelHistory from '@typings/database/team_channel_history';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';

const {
    MY_TEAM,
    SLASH_COMMAND,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

/**
 * preparePreferenceRecord: Prepares record of entity 'TEAM_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareTeamMembershipRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawTeamMembership;
    const record = value.record as TeamMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (teamMembership: TeamMembership) => {
        teamMembership._raw.id = isCreateAction ? (raw?.id ?? teamMembership.id) : record.id;
        teamMembership.teamId = raw.team_id;
        teamMembership.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_MEMBERSHIP,
        value,
        generator,
    });
};

/**
 * prepareTeamRecord: Prepares record of entity 'TEAM' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareTeamRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawTeam;
    const record = value.record as Team;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (team: Team) => {
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
        generator,
    });
};

/**
 * prepareTeamChannelHistoryRecord: Prepares record of entity 'TEAM_CHANNEL_HISTORY' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareTeamChannelHistoryRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawTeamChannelHistory;
    const record = value.record as TeamChannelHistory;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (teamChannelHistory: TeamChannelHistory) => {
        teamChannelHistory._raw.id = isCreateAction ? (teamChannelHistory.id) : record.id;
        teamChannelHistory.teamId = raw.team_id;
        teamChannelHistory.channelIds = raw.channel_ids;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_CHANNEL_HISTORY,
        value,
        generator,
    });
};

/**
 * prepareTeamSearchHistoryRecord: Prepares record of entity 'TEAM_SEARCH_HISTORY' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareTeamSearchHistoryRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawTeamSearchHistory;
    const record = value.record as TeamSearchHistory;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (teamSearchHistory: TeamSearchHistory) => {
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
        generator,
    });
};

/**
 * prepareSlashCommandRecord: Prepares record of entity 'SLASH_COMMAND' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareSlashCommandRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawSlashCommand;
    const record = value.record as SlashCommand;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (slashCommand: SlashCommand) => {
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
        generator,
    });
};

/**
 * prepareMyTeamRecord: Prepares record of entity 'MY_TEAM' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareMyTeamRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawMyTeam;
    const record = value.record as MyTeam;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (myTeam: MyTeam) => {
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
        generator,
    });
};
