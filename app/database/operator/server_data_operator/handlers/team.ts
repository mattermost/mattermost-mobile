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
import {
    HandleMyTeamArgs,
    HandleSlashCommandArgs,
    HandleTeamArgs,
    HandleTeamChannelHistoryArgs,
    HandleTeamMembershipArgs,
    HandleTeamSearchHistoryArgs,
} from '@typings/database/database';
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

export interface TeamHandlerMix {
  handleTeamMemberships: ({teamMemberships, prepareRecordsOnly}: HandleTeamMembershipArgs) => TeamMembership[];
  handleTeam: ({teams, prepareRecordsOnly}: HandleTeamArgs) => Team[];
  handleTeamChannelHistory: ({teamChannelHistories, prepareRecordsOnly}: HandleTeamChannelHistoryArgs) => TeamChannelHistory[];
  handleSlashCommand: ({slashCommands, prepareRecordsOnly}: HandleSlashCommandArgs) => SlashCommand[];
  handleMyTeam: ({myTeams, prepareRecordsOnly}: HandleMyTeamArgs) => MyTeam[];
}

const TeamHandler = (superclass: any) => class extends superclass {
    /**
     * handleTeamMemberships: Handler responsible for the Create/Update operations occurring on the TEAM_MEMBERSHIP table from the 'Server' schema
     * @param {HandleTeamMembershipArgs} teamMembershipsArgs
     * @param {RawTeamMembership[]} teamMembershipsArgs.teamMemberships
     * @param {boolean} teamMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamMembership[]}
     */
    handleTeamMemberships = async ({teamMemberships, prepareRecordsOnly = true}: HandleTeamMembershipArgs) => {
        let records: TeamMembership[] = [];

        if (!teamMemberships.length) {
            throw new DataOperatorException(
                'An empty "teamMemberships" array has been passed to the handleTeamMemberships method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamMemberships, key: 'team_id'});

        records = await this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordTeamMembershipEqualToRaw,
            transformer: transformTeamMembershipRecord,
            createOrUpdateRawValues,
            tableName: TEAM_MEMBERSHIP,
            prepareRecordsOnly,
        });

        return records;
    };

    /**
     * handleTeam: Handler responsible for the Create/Update operations occurring on the TEAM table from the 'Server' schema
     * @param {HandleTeamArgs} teamsArgs
     * @param {RawTeam[]} teamsArgs.teams
     * @param {boolean} teamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Team[]}
     */
    handleTeam = async ({teams, prepareRecordsOnly = true}: HandleTeamArgs) => {
        let records: Team[] = [];

        if (!teams.length) {
            throw new DataOperatorException(
                'An empty "teams" array has been passed to the handleTeam method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teams, key: 'id'});

        records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTeamEqualToRaw,
            transformer: transformTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM,
        });

        return records;
    };

    /**
     * handleTeamChannelHistory: Handler responsible for the Create/Update operations occurring on the TEAM_CHANNEL_HISTORY table from the 'Server' schema
     * @param {HandleTeamChannelHistoryArgs} teamChannelHistoriesArgs
     * @param {RawTeamChannelHistory[]} teamChannelHistoriesArgs.teamChannelHistories
     * @param {boolean} teamChannelHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamChannelHistory[]}
     */
    handleTeamChannelHistory = async ({teamChannelHistories, prepareRecordsOnly = true}: HandleTeamChannelHistoryArgs) => {
        let records: TeamChannelHistory[] = [];

        if (!teamChannelHistories.length) {
            throw new DataOperatorException(
                'An empty "teamChannelHistories" array has been passed to the handleTeamChannelHistory method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamChannelHistories, key: 'team_id'});

        records = await this.handleRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordTeamChannelHistoryEqualToRaw,
            transformer: transformTeamChannelHistoryRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM_CHANNEL_HISTORY,
        });

        return records;
    };

    /**
     * handleTeamSearchHistory: Handler responsible for the Create/Update operations occurring on the TEAM_SEARCH_HISTORY table from the 'Server' schema
     * @param {HandleTeamSearchHistoryArgs} teamSearchHistoriesArgs
     * @param {RawTeamSearchHistory[]} teamSearchHistoriesArgs.teamSearchHistories
     * @param {boolean} teamSearchHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamSearchHistory[]}
     */
    handleTeamSearchHistory = async ({teamSearchHistories, prepareRecordsOnly = true}: HandleTeamSearchHistoryArgs) => {
        let records: TeamSearchHistory[] = [];

        if (!teamSearchHistories.length) {
            throw new DataOperatorException(
                'An empty "teamSearchHistories" array has been passed to the handleTeamSearchHistory method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: teamSearchHistories, key: 'term'});

        records = await this.handleRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordTeamSearchHistoryEqualToRaw,
            transformer: transformTeamSearchHistoryRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: TEAM_SEARCH_HISTORY,
        });

        return records;
    };

    /**
     * handleSlashCommand: Handler responsible for the Create/Update operations occurring on the SLASH_COMMAND table from the 'Server' schema
     * @param {HandleSlashCommandArgs} slashCommandsArgs
     * @param {RawSlashCommand[]} slashCommandsArgs.slashCommands
     * @param {boolean} slashCommandsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {SlashCommand[]}
     */
    handleSlashCommand = async ({slashCommands, prepareRecordsOnly = true}: HandleSlashCommandArgs) => {
        let records: SlashCommand[] = [];

        if (!slashCommands.length) {
            throw new DataOperatorException(
                'An empty "slashCommands" array has been passed to the handleSlashCommand method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: slashCommands, key: 'id'});

        records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordSlashCommandEqualToRaw,
            transformer: transformSlashCommandRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: SLASH_COMMAND,
        });

        return records;
    };

    /**
     * handleMyTeam: Handler responsible for the Create/Update operations occurring on the MY_TEAM table from the 'Server' schema
     * @param {HandleMyTeamArgs} myTeamsArgs
     * @param {RawMyTeam[]} myTeamsArgs.myTeams
     * @param {boolean} myTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyTeam[]}
     */
    handleMyTeam = async ({myTeams, prepareRecordsOnly = true}: HandleMyTeamArgs) => {
        let records: MyTeam[] = [];

        if (!myTeams.length) {
            throw new DataOperatorException(
                'An empty "myTeams" array has been passed to the handleSlashCommand method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: myTeams, key: 'team_id'});

        records = await this.handleRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordMyTeamEqualToRaw,
            transformer: transformMyTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_TEAM,
        });

        return records;
    };
};

export default TeamHandler;
