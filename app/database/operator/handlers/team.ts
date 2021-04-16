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
} from '@database/operator/comparators';
import {
    prepareMyTeamRecord,
    prepareSlashCommandRecord,
    prepareTeamChannelHistoryRecord,
    prepareTeamMembershipRecord,
    prepareTeamRecord,
    prepareTeamSearchHistoryRecord,
} from '@database/operator/prepareRecords/team';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {
    HandleMyTeamArgs,
    HandleSlashCommandArgs,
    HandleTeamArgs,
    HandleTeamChannelHistoryArgs,
    HandleTeamMembershipArgs,
    HandleTeamSearchHistoryArgs,
} from '@typings/database/database';
import MyTeam from '@typings/database/my_team';
import SlashCommand from '@typings/database/slash_command';
import Team from '@typings/database/team';
import TeamChannelHistory from '@typings/database/team_channel_history';
import TeamMembership from '@typings/database/team_membership';

const {
    MY_TEAM,
    SLASH_COMMAND,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

export interface TeamHandlerMix {
    handleTeamMemberships : ({teamMemberships, prepareRecordsOnly}: HandleTeamMembershipArgs) => TeamMembership[] | boolean,
    handleTeam: ({teams, prepareRecordsOnly}: HandleTeamArgs) => Team[] | boolean
    handleTeamChannelHistory : ({teamChannelHistories, prepareRecordsOnly}: HandleTeamChannelHistoryArgs) => TeamChannelHistory[]| boolean,
    handleSlashCommand : ({slashCommands, prepareRecordsOnly} : HandleSlashCommandArgs) => SlashCommand[]| boolean,
    handleMyTeam : ({myTeams, prepareRecordsOnly}: HandleMyTeamArgs) => MyTeam[]| boolean
}

const TeamHandler = (superclass: any) => class extends superclass {
    /**
     * handleTeamMemberships: Handler responsible for the Create/Update operations occurring on the TEAM_MEMBERSHIP entity from the 'Server' schema
     * @param {HandleTeamMembershipArgs} teamMembershipsArgs
     * @param {RawTeamMembership[]} teamMembershipsArgs.teamMemberships
     * @param {boolean} teamMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamMembership[] | boolean}
     */
    handleTeamMemberships = async ({teamMemberships, prepareRecordsOnly = true}: HandleTeamMembershipArgs) => {
        if (!teamMemberships.length) {
            throw new DataOperatorException(
                'An empty "teamMemberships" array has been passed to the handleTeamMemberships method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: teamMemberships, key: 'team_id'});

        const records = await this.handleEntityRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordTeamMembershipEqualToRaw,
            operator: prepareTeamMembershipRecord,
            rawValues,
            tableName: TEAM_MEMBERSHIP,
            prepareRecordsOnly,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleTeam: Handler responsible for the Create/Update operations occurring on the TEAM entity from the 'Server' schema
     * @param {HandleTeamArgs} teamsArgs
     * @param {RawTeam[]} teamsArgs.teams
     * @param {boolean} teamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Team[] | boolean}
     */
    handleTeam = async ({teams, prepareRecordsOnly = true}: HandleTeamArgs) => {
        if (!teams.length) {
            throw new DataOperatorException(
                'An empty "teams" array has been passed to the handleTeam method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: teams, key: 'id'});

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTeamEqualToRaw,
            operator: prepareTeamRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: TEAM,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleTeamChannelHistory: Handler responsible for the Create/Update operations occurring on the TEAM_CHANNEL_HISTORY entity from the 'Server' schema
     * @param {HandleTeamChannelHistoryArgs} teamChannelHistoriesArgs
     * @param {RawTeamChannelHistory[]} teamChannelHistoriesArgs.teamChannelHistories
     * @param {boolean} teamChannelHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamChannelHistory[]| boolean}
     */
    handleTeamChannelHistory = async ({teamChannelHistories, prepareRecordsOnly = true}: HandleTeamChannelHistoryArgs) => {
        if (!teamChannelHistories.length) {
            throw new DataOperatorException(
                'An empty "teamChannelHistories" array has been passed to the handleTeamChannelHistory method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: teamChannelHistories, key: 'team_id'});

        const records = await this.handleEntityRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordTeamChannelHistoryEqualToRaw,
            operator: prepareTeamChannelHistoryRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: TEAM_CHANNEL_HISTORY,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleTeamSearchHistory: Handler responsible for the Create/Update operations occurring on the TEAM_SEARCH_HISTORY entity from the 'Server' schema
     * @param {HandleTeamSearchHistoryArgs} teamSearchHistoriesArgs
     * @param {RawTeamSearchHistory[]} teamSearchHistoriesArgs.teamSearchHistories
     * @param {boolean} teamSearchHistoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {TeamSearchHistory[]| boolean}
     */
    handleTeamSearchHistory = async ({teamSearchHistories, prepareRecordsOnly = true}: HandleTeamSearchHistoryArgs) => {
        if (!teamSearchHistories.length) {
            throw new DataOperatorException(
                'An empty "teamSearchHistories" array has been passed to the handleTeamSearchHistory method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: teamSearchHistories, key: 'term'});

        const records = await this.handleEntityRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordTeamSearchHistoryEqualToRaw,
            operator: prepareTeamSearchHistoryRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: TEAM_SEARCH_HISTORY,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleSlashCommand: Handler responsible for the Create/Update operations occurring on the SLASH_COMMAND entity from the 'Server' schema
     * @param {HandleSlashCommandArgs} slashCommandsArgs
     * @param {RawSlashCommand[]} slashCommandsArgs.slashCommands
     * @param {boolean} slashCommandsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {SlashCommand[]| boolean}
     */
    handleSlashCommand = async ({slashCommands, prepareRecordsOnly = true} : HandleSlashCommandArgs) => {
        if (!slashCommands.length) {
            throw new DataOperatorException(
                'An empty "slashCommands" array has been passed to the handleSlashCommand method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: slashCommands, key: 'id'});

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordSlashCommandEqualToRaw,
            operator: prepareSlashCommandRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: SLASH_COMMAND,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleMyTeam: Handler responsible for the Create/Update operations occurring on the MY_TEAM entity from the 'Server' schema
     * @param {HandleMyTeamArgs} myTeamsArgs
     * @param {RawMyTeam[]} myTeamsArgs.myTeams
     * @param {boolean} myTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyTeam[]| boolean}
     */
    handleMyTeam = async ({myTeams, prepareRecordsOnly = true}: HandleMyTeamArgs) => {
        if (!myTeams.length) {
            throw new DataOperatorException(
                'An empty "myTeams" array has been passed to the handleSlashCommand method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: myTeams, key: 'team_id'});

        const records = await this.handleEntityRecords({
            fieldName: 'team_id',
            findMatchingRecordBy: isRecordMyTeamEqualToRaw,
            operator: prepareMyTeamRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: MY_TEAM,
        });

        return prepareRecordsOnly && records?.length && records;
    };
};

export default TeamHandler;
