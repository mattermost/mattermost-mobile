// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
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

import ServerDataOperator from '..';

describe('*** Operator: Team Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleTeam: should write to the TEAM table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teams: Team[] = [
            {
                id: 'rcgiyftm7jyrxnmdfdfa1osd8zswby',
                create_at: 1445538153952,
                update_at: 1588876392150,
                delete_at: 0,
                display_name: 'Contributors',
                name: 'core',
                description: '',
                email: '',
                type: 'O',
                company_name: '',
                allowed_domains: '',
                invite_id: 'codoy5s743rq5mk18i7u5dfdfksz7e',
                allow_open_invite: true,
                last_team_icon_update: 1525181587639,
                scheme_id: 'hbwgrncq1pfcdkpotzidfdmarn95o',
                group_constrained: null,
            },
        ];

        await operator.handleTeam({
            teams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: teams,
            tableName: 'Team',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamEqualToRaw,
            transformer: transformTeamRecord,
        });
    });

    it('=> HandleTeamMemberships: should write to the TEAM_MEMBERSHIP table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamMemberships: TeamMembership[] = [
            {
                team_id: 'a',
                user_id: 'ab',
                roles: '',
                delete_at: 0,
                msg_count: 0,
                mention_count: 0,
                scheme_user: true,
                scheme_admin: false,
            },
        ];

        await operator.handleTeamMemberships({
            teamMemberships,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            createOrUpdateRawValues: teamMemberships,
            tableName: 'TeamMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamMembershipEqualToRaw,
            transformer: transformTeamMembershipRecord,
        });
    });

    it('=> HandleMyTeam: should write to the MY_TEAM table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const myTeams = [
            {
                id: 'teamA',
                roles: 'roleA, roleB, roleC',
                is_unread: true,
                mentions_count: 3,
            },
        ];

        await operator.handleMyTeam({
            myTeams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: myTeams,
            tableName: 'MyTeam',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyTeamEqualToRaw,
            transformer: transformMyTeamRecord,
        });
    });

    it('=> HandleTeamChannelHistory: should write to the TEAM_CHANNEL_HISTORY table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamChannelHistories = [
            {
                id: 'a',
                channel_ids: ['ca', 'cb'],
            },
        ];

        await operator.handleTeamChannelHistory({
            teamChannelHistories,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: teamChannelHistories,
            tableName: 'TeamChannelHistory',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamChannelHistoryEqualToRaw,
            transformer: transformTeamChannelHistoryRecord,
        });
    });

    it('=> HandleTeamSearchHistory: should write to the TEAM_SEARCH_HISTORY table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamSearchHistories: TeamSearchHistory[] = [
            {
                team_id: 'a',
                term: 'termA',
                display_term: 'termA',
                created_at: 1445538153952,
            },
        ];

        await operator.handleTeamSearchHistory({
            teamSearchHistories,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'team_id',
            createOrUpdateRawValues: teamSearchHistories,
            tableName: 'TeamSearchHistory',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamSearchHistoryEqualToRaw,
            transformer: transformTeamSearchHistoryRecord,
        });
    });

    it('=> HandleSlashCommand: should write to the SLASH_COMMAND table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const slashCommands = [
            {
                id: 'command_1',
                auto_complete: true,
                auto_complete_desc: 'mock_command',
                auto_complete_hint: 'hint',
                create_at: 1445538153952,
                creator_id: 'creator_id',
                delete_at: 1445538153952,
                description: 'description',
                display_name: 'display_name',
                icon_url: 'display_name',
                method: 'get',
                team_id: 'teamA',
                token: 'token',
                trigger: 'trigger',
                update_at: 1445538153953,
                url: 'url',
                username: 'userA',
            },
        ];

        await operator.handleSlashCommand({
            slashCommands,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: slashCommands,
            tableName: 'SlashCommand',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordSlashCommandEqualToRaw,
            transformer: transformSlashCommandRecord,
        });
    });
});
