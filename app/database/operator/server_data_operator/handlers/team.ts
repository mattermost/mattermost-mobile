// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordMyTeamEqualToRaw,
    isRecordSlashCommandEqualToRaw,
    isRecordTeamChannelHistoryEqualToRaw,
    isRecordTeamEqualToRaw,
    isRecordTeamMembershipEqualToRaw,
    isRecordTeamSearchHistoryEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformMyTeamRecord,
    transformSlashCommandRecord,
    transformTeamChannelHistoryRecord,
    transformTeamMembershipRecord,
    transformTeamRecord,
    transformTeamSearchHistoryRecord,
} from '@database/operator/server_data_operator/transformers/team';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {
    HandleMyTeamArgs, HandleSlashCommandArgs, HandleTeamArgs,
    HandleTeamChannelHistoryArgs, HandleTeamMembershipArgs, HandleTeamSearchHistoryArgs,
} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type SlashCommandModel from '@typings/database/models/servers/slash_command';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const {
    MY_TEAM,
    SLASH_COMMAND,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

export interface TeamHandlerMix {
  handleTeamMemberships: ({teamMemberships, prepareRecordsOnly}: HandleTeamMembershipArgs) => Promise<TeamMembershipModel[]>;
  handleTeam: ({teams, prepareRecordsOnly}: HandleTeamArgs) => Promise<TeamModel[]>;
  handleTeamChannelHistory: ({teamChannelHistories, prepareRecordsOnly}: HandleTeamChannelHistoryArgs) => Promise<TeamChannelHistoryModel[]>;
  handleTeamSearchHistory: ({teamSearchHistories, prepareRecordsOnly}: HandleTeamSearchHistoryArgs) => Promise<TeamSearchHistoryModel[]>;
  handleSlashCommand: ({slashCommands, prepareRecordsOnly}: HandleSlashCommandArgs) => Promise<SlashCommandModel[]>;
  handleMyTeam: ({myTeams, prepareRecordsOnly}: HandleMyTeamArgs) => Promise<MyTeamModel[]>;
}

const TeamHandler = (superclass: any) => class extends superclass {
    /**
     * handleTeamMemberships: Handler responsible for the Create/Update operations occurring on the TEAM_MEMBERSHIP table from the 'Server' schema
     * @param {HandleTeamMembershipArgs} teamMembershipsArgs
     * @param {TeamMembership[]} teamMembershipsArgs.teamMemberships
     * @param {boolean} teamMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<TeamMembershipModel[]>}
     */
    handleTeamMemberships = ({teamMemberships, prepareRecordsOnly = true}: HandleTeamMembershipArgs): Promise<TeamMembershipModel[]> => {
        if (!teamMemberships.length) {
            throw new DataOperatorException(
                'An empty "teamMemberships" array has been passed to the handleTeamMemberships method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamMemberships, key: 'team_id'});

        return this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordTeamMembershipEqualToRaw,
            transformer: transformTeamMembershipRecord,
            createOrUpdateRawValues,
            tableName: TEAM_MEMBERSHIP,
            prepareRecordsOnly,
        });
    };

    /**
     * handleTeam: Handler responsible for the Create/Update operations occurring on the TEAM table from the 'Server' schema
     * @param {HandleTeamArgs} teamsArgs
     * @param {Team[]} teamsArgs.teams
     * @param {boolean} teamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<TeamModel[]>}
     */
    handleTeam = ({teams, prepareRecordsOnly = true}: HandleTeamArgs): Promise<TeamModel[]> => {
        if (!teams.length) {
            throw new DataOperatorException(
                'An empty "teams" array has been passed to the handleTeam method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teams, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTeamEqualToRaw,
            transformer: transformTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM,
        });
    };

    /**
     * handleTeamChannelHistory: Handler responsible for the Create/Update operations occurring on the TEAM_CHANNEL_HISTORY table from the 'Server' schema
     * @param {HandleTeamChannelHistoryArgs} teamChannelHistoriesArgs
     * @param {TeamChannelHistory[]} teamChannelHistoriesArgs.teamChannelHistories
     * @param {boolean} teamChannelHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<TeamChannelHistoryModel[]>}
     */
    handleTeamChannelHistory = ({teamChannelHistories, prepareRecordsOnly = true}: HandleTeamChannelHistoryArgs): Promise<TeamChannelHistoryModel[]> => {
        if (!teamChannelHistories.length) {
            throw new DataOperatorException(
                'An empty "teamChannelHistories" array has been passed to the handleTeamChannelHistory method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamChannelHistories, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTeamChannelHistoryEqualToRaw,
            transformer: transformTeamChannelHistoryRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM_CHANNEL_HISTORY,
        });
    };

    /**
     * handleTeamSearchHistory: Handler responsible for the Create/Update operations occurring on the TEAM_SEARCH_HISTORY table from the 'Server' schema
     * @param {HandleTeamSearchHistoryArgs} teamSearchHistoriesArgs
     * @param {TeamSearchHistory[]} teamSearchHistoriesArgs.teamSearchHistories
     * @param {boolean} teamSearchHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<TeamSearchHistoryModel[]>}
     */
    handleTeamSearchHistory = ({teamSearchHistories, prepareRecordsOnly = true}: HandleTeamSearchHistoryArgs): Promise<TeamSearchHistoryModel[]> => {
        if (!teamSearchHistories.length) {
            throw new DataOperatorException(
                'An empty "teamSearchHistories" array has been passed to the handleTeamSearchHistory method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamSearchHistories, key: 'term'});

        return this.handleRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordTeamSearchHistoryEqualToRaw,
            transformer: transformTeamSearchHistoryRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM_SEARCH_HISTORY,
        });
    };

    /**
     * handleSlashCommand: Handler responsible for the Create/Update operations occurring on the SLASH_COMMAND table from the 'Server' schema
     * @param {HandleSlashCommandArgs} slashCommandsArgs
     * @param {SlashCommand[]} slashCommandsArgs.slashCommands
     * @param {boolean} slashCommandsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<SlashCommandModel[]>}
     */
    handleSlashCommand = ({slashCommands, prepareRecordsOnly = true}: HandleSlashCommandArgs): Promise<SlashCommandModel[]> => {
        if (!slashCommands.length) {
            throw new DataOperatorException(
                'An empty "slashCommands" array has been passed to the handleSlashCommand method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: slashCommands, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordSlashCommandEqualToRaw,
            transformer: transformSlashCommandRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: SLASH_COMMAND,
        });
    };

    /**
     * handleMyTeam: Handler responsible for the Create/Update operations occurring on the MY_TEAM table from the 'Server' schema
     * @param {HandleMyTeamArgs} myTeamsArgs
     * @param {MyTeam[]} myTeamsArgs.myTeams
     * @param {boolean} myTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<MyTeamModel[]>}
     */
    handleMyTeam = ({myTeams, prepareRecordsOnly = true}: HandleMyTeamArgs): Promise<MyTeamModel[]> => {
        if (!myTeams.length) {
            throw new DataOperatorException(
                'An empty "myTeams" array has been passed to the handleSlashCommand method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: myTeams, key: 'team_id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordMyTeamEqualToRaw,
            transformer: transformMyTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_TEAM,
        });
    };
};

export default TeamHandler;
